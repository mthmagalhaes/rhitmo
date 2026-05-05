// Sprint 13.1 — Briefing Executivo do Liderado.
// Lê context_evidence dos últimos N dias, gera um resumo estruturado em 4 blocos
// (wins, risks, in_motion, conversations) via Lovable AI, faz cache em
// `context_briefs` (24h) e devolve o JSON.
//
// Ownership: o leader_user_id é resolvido via `teams.leader_user_id` (membership
// chain). Só o líder dono do liderado consegue gerar/ver.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  aiToolCall,
  gatewayErrorResponse,
} from '../_shared/aiGateway.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface BriefItem {
  text: string;
  evidence_ids: string[];
}

interface BriefPayload {
  wins: BriefItem[];
  risks: BriefItem[];
  in_motion: BriefItem[];
  conversations: BriefItem[];
}

const briefTool = {
  type: 'function',
  function: {
    name: 'emit_executive_brief',
    description:
      'Resumo executivo do liderado em 4 blocos curtos (wins, risks, in_motion, conversations). Cada item é 1 frase objetiva em pt-BR e cita evidence_ids exatos.',
    parameters: {
      type: 'object',
      properties: {
        wins: {
          type: 'array',
          description: 'Sinais positivos: kudos, metas batidas, entregas, sentiment positivo. 0–4 itens.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              evidence_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['text', 'evidence_ids'],
          },
        },
        risks: {
          type: 'array',
          description: 'Pontos de atenção: pulse caindo, ausência de 1:1, sentiment constructive/warning, conflitos. 0–4 itens.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              evidence_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['text', 'evidence_ids'],
          },
        },
        in_motion: {
          type: 'array',
          description: 'Em andamento: metas ativas, PDI, projetos em curso. 0–4 itens.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              evidence_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['text', 'evidence_ids'],
          },
        },
        conversations: {
          type: 'array',
          description: 'Conversas recentes: 1:1s, transcripts de reuniões, magic paste. 0–4 itens.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              evidence_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['text', 'evidence_ids'],
          },
        },
      },
      required: ['wins', 'risks', 'in_motion', 'conversations'],
    },
  },
};

const SYSTEM_PROMPT = `Você é a Rhitmo, parceira de liderança. Gere um BRIEFING EXECUTIVO sobre o liderado, em pt-BR.

REGRAS DE OURO:
- Cada item: UMA frase curta (até 18 palavras), específica, factual, sem floreio.
- NUNCA invente fato. Use apenas o que está nas evidências fornecidas.
- Cada item DEVE referenciar 1+ evidence_ids reais do input.
- Distribua em 4 blocos: ganhos (wins), riscos (risks), em movimento (in_motion), conversas recentes (conversations).
- Se um bloco não tem material, retorne array vazio. Não invente.
- Total máximo: 4 itens por bloco.
- Tom: executivo, direto. Não use emoji nem markdown. Não diga "o liderado" — use o primeiro nome se disponível.
- Para "conversations": cite a data/tipo (ex.: "1:1 em 12/Mai falou sobre carga", "Reunião com cliente Y em 14/Mai").`;

interface EvidenceRow {
  id: string;
  evidence_type: string | null;
  source_table: string;
  occurred_at: string;
  title: string | null;
  summary: string | null;
  sentiment: string | null;
  tags: string[] | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth client (validates JWT)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // Service-role client for ownership check + writes
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const memberId = body?.member_id as string | undefined;
    const windowDays = ([7, 14, 30] as const).includes(body?.window_days)
      ? (body.window_days as 7 | 14 | 30)
      : 7;
    const forceRefresh = body?.force_refresh === true;

    if (!memberId) {
      return new Response(JSON.stringify({ error: 'member_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ownership: member → team → leader_user_id must equal userId
    const { data: memberRow, error: memberErr } = await admin
      .from('team_members')
      .select('id, name, team_id, teams!inner(leader_user_id, workspace_id)')
      .eq('id', memberId)
      .maybeSingle();

    if (memberErr || !memberRow) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // deno-lint-ignore no-explicit-any
    const team = (memberRow as any).teams;
    const leaderUserId = team?.leader_user_id as string | undefined;
    if (!leaderUserId || leaderUserId !== userId) {
      // Allow workspace owner too (HR Admin model)
      const { data: ws } = await admin
        .from('workspaces')
        .select('owner_id')
        .eq('id', team?.workspace_id)
        .maybeSingle();
      if (!ws || ws.owner_id !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const now = new Date();
    const windowEnd = now;
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    // Cache lookup: same member + window_days + window_start within 24h
    if (!forceRefresh) {
      const { data: cached } = await admin
        .from('context_briefs')
        .select('*')
        .eq('member_id', memberId)
        .eq('window_days', windowDays)
        .gte('generated_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ brief: cached, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch evidence within window
    const { data: evidence, error: evErr } = await admin
      .from('context_evidence')
      .select('id, evidence_type, source_table, occurred_at, title, summary, sentiment, tags')
      .eq('member_id', memberId)
      .gte('occurred_at', windowStart.toISOString())
      .lte('occurred_at', windowEnd.toISOString())
      .order('occurred_at', { ascending: false })
      .limit(80);

    if (evErr) {
      return new Response(JSON.stringify({ error: evErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = (evidence ?? []) as EvidenceRow[];

    // Filter out leader_nudges (leader-output noise; not real signal about the member)
    const signalRows = rows.filter((r) => r.source_table !== 'leader_nudges');

    let payload: BriefPayload = { wins: [], risks: [], in_motion: [], conversations: [] };

    if (signalRows.length > 0) {
      // deno-lint-ignore no-explicit-any
      const memberName = (memberRow as any).name?.split(' ')[0] ?? 'liderado';
      const evidenceBlock = signalRows
        .map((r) => {
          const date = r.occurred_at.slice(0, 10);
          const txt = (r.summary || r.title || '').replace(/\s+/g, ' ').slice(0, 280);
          return `- id=${r.id} | ${date} | ${r.source_table} | sentiment=${r.sentiment ?? 'n/a'} | tags=${(r.tags ?? []).join(',')} | ${txt}`;
        })
        .join('\n');

      try {
        const args = await aiToolCall<BriefPayload>({
          model: 'google/gemini-2.5-flash-lite',
          temperature: 0.3,
          max_tokens: 1200,
          tools: [briefTool],
          toolName: 'emit_executive_brief',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Liderado: ${memberName}\nJanela: últimos ${windowDays} dias\n\nEvidências (id | data | fonte | sentiment | tags | resumo):\n${evidenceBlock}\n\nGere o briefing chamando emit_executive_brief.`,
            },
          ],
        });

        // Sanitize: keep only evidence_ids that exist in input
        const validIds = new Set(signalRows.map((r) => r.id));
        const cleanBlock = (arr: BriefItem[] | undefined): BriefItem[] =>
          (arr ?? [])
            .map((it) => ({
              text: String(it.text ?? '').trim(),
              evidence_ids: (it.evidence_ids ?? []).filter((id) => validIds.has(id)),
            }))
            .filter((it) => it.text.length > 0)
            .slice(0, 4);

        payload = {
          wins: cleanBlock(args.wins),
          risks: cleanBlock(args.risks),
          in_motion: cleanBlock(args.in_motion),
          conversations: cleanBlock(args.conversations),
        };
      } catch (err) {
        return gatewayErrorResponse(err, corsHeaders);
      }
    }

    // Upsert: same key (member_id, window_days, window_start). We round window_start
    // to the start of the day to make the unique key meaningful for cache hits.
    const dayStart = new Date(windowStart);
    dayStart.setUTCHours(0, 0, 0, 0);

    const { data: saved, error: saveErr } = await admin
      .from('context_briefs')
      .upsert(
        {
          member_id: memberId,
          leader_user_id: leaderUserId ?? userId,
          window_days: windowDays,
          window_start: dayStart.toISOString(),
          window_end: windowEnd.toISOString(),
          wins: payload.wins,
          risks: payload.risks,
          in_motion: payload.in_motion,
          conversations: payload.conversations,
          evidence_count: signalRows.length,
          generated_at: now.toISOString(),
          model: 'google/gemini-2.5-flash-lite',
        },
        { onConflict: 'member_id,window_days,window_start' },
      )
      .select()
      .single();

    if (saveErr) {
      return new Response(JSON.stringify({ error: saveErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ brief: saved, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[generate-context-brief] error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
