import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  RHITMO_IDENTITY,
  GUARDRAILS_PROMPT,
} from '../_shared/rhitmo-constitution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Body {
  member_id: string;
  period_month?: string; // ISO yyyy-mm-dd, will be normalized to first day of month
  regenerate?: boolean;
}

interface MonthlyRecapAI {
  highlight: { text: string; evidence: Array<{ feedback_id?: string; meeting_id?: string; date: string }> };
  concern: { text: string; evidence: Array<{ feedback_id?: string; meeting_id?: string; date: string }> };
  dominant_pattern: string;
}

function firstDayOfMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function lastMonthStart(): string {
  const now = new Date();
  // first day of previous month
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return firstDayOfMonth(d);
}

function monthRange(periodMonth: string): { start: string; end: string } {
  const [y, m] = periodMonth.split('-').map((x) => parseInt(x, 10));
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return { start, end };
}

async function callMonthlyRecapAI(
  memberName: string,
  feedbacks: Array<{ id: string; content: string; type: string; sentiment: string | null; tags: string[] | null; occurred_at: string; summary: string | null }>,
  meetings: Array<{ id: string; leader_notes: string | null; transcript: string | null; extracted_themes: string[] | null; created_at: string }>,
): Promise<MonthlyRecapAI | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `${RHITMO_IDENTITY}

Você é o "Rhitmo Mensal" — uma função especializada em transformar o registro bruto do mês de um líder sobre um liderado em um resumo estruturado de 3 elementos:

1. HIGHLIGHT: o que se destacou positivamente — sempre com evidência (cite o ID e a data da nota/1:1 de origem)
2. CONCERN: o que preocupou ou ficou abaixo — linguagem factual, sem drama, sempre com evidência
3. DOMINANT_PATTERN: uma frase única descrevendo o comportamento dominante do mês

${GUARDRAILS_PROMPT}

REGRAS ESPECÍFICAS DO MENSAL:
1. **Anti-alucinação absoluta**: cada highlight e concern PRECISA citar pelo menos 1 evidência real (feedback_id ou meeting_id) das listas fornecidas. Nunca invente IDs.
2. Se não houver evidência clara para highlight ou concern, retorne text="" e evidence=[] para aquele bloco.
3. Linguagem factual e seca. Não use "incrível", "fantástico", "preocupante demais". Use "entregou X", "atrasou Y", "comunicou de forma proativa".
4. Foque APENAS em ações de ${memberName}. Ignore o que outras pessoas fizeram.
5. Resposta deve ser JSON válido em português brasileiro.`;

  const evidenceText = [
    feedbacks.length > 0
      ? `## NOTAS DO LÍDER (${feedbacks.length}):\n${feedbacks
          .map(
            (f) =>
              `[feedback_id=${f.id} | data=${f.occurred_at.slice(0, 10)} | tipo=${f.type}${f.sentiment ? ' | sentimento=' + f.sentiment : ''}${f.tags && f.tags.length ? ' | tags=' + f.tags.join(',') : ''}]\n${f.content.slice(0, 800)}\n${f.summary ? 'Resumo: ' + f.summary : ''}`,
          )
          .join('\n\n')}`
      : '## NOTAS DO LÍDER: (nenhuma)',
    meetings.length > 0
      ? `\n\n## REUNIÕES 1:1 (${meetings.length}):\n${meetings
          .map(
            (m) =>
              `[meeting_id=${m.id} | data=${m.created_at.slice(0, 10)}${m.extracted_themes && m.extracted_themes.length ? ' | temas=' + m.extracted_themes.join(',') : ''}]\n${(m.leader_notes || m.transcript || '').slice(0, 800)}`,
          )
          .join('\n\n')}`
      : '',
  ].join('');

  const userPrompt = `Liderado: ${memberName}

EVIDÊNCIAS DO MÊS:
${evidenceText}

Responda APENAS com JSON no formato exato:
{
  "highlight": {
    "text": "frase factual com evidência (1-2 linhas)",
    "evidence": [{"feedback_id": "uuid-real", "date": "YYYY-MM-DD"}]
  },
  "concern": {
    "text": "frase factual com evidência (1-2 linhas) ou string vazia",
    "evidence": [{"meeting_id": "uuid-real", "date": "YYYY-MM-DD"}]
  },
  "dominant_pattern": "uma frase única descrevendo o comportamento dominante do período"
}`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[generate-monthly-recap] AI error', res.status, txt);
    if (res.status === 429) throw new Error('AI rate limit exceeded');
    if (res.status === 402) throw new Error('AI credits exhausted');
    return null;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as MonthlyRecapAI;
  } catch (e) {
    console.error('[generate-monthly-recap] failed to parse AI JSON', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.member_id) {
      return new Response(JSON.stringify({ error: 'member_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const periodMonth = body.period_month
      ? firstDayOfMonth(new Date(body.period_month + 'T00:00:00Z'))
      : lastMonthStart();

    // Resolve member + workspace + leader auth
    const { data: member, error: mErr } = await admin
      .from('team_members')
      .select('id, name, team_id, teams!inner(id, leader_user_id, workspace_id)')
      .eq('id', body.member_id)
      .maybeSingle();
    if (mErr || !member) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const team = (member as any).teams;
    const leaderUserId = team?.leader_user_id as string | null;
    const workspaceId = team?.workspace_id as string;
    if (leaderUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden — only the team leader can generate recaps' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing recap
    const { data: existing } = await admin
      .from('monthly_recaps')
      .select('id, status')
      .eq('member_id', member.id)
      .eq('period_month', periodMonth)
      .maybeSingle();

    if (existing && existing.status === 'confirmed') {
      return new Response(
        JSON.stringify({ error: 'Already confirmed — cannot regenerate', recap_id: existing.id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (existing && !body.regenerate) {
      return new Response(
        JSON.stringify({ ok: true, recap_id: existing.id, message: 'Draft already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { start, end } = monthRange(periodMonth);

    // Fetch evidence
    const [{ data: feedbacks }, { data: meetings }] = await Promise.all([
      admin
        .from('feedbacks')
        .select('id, content, type, sentiment, tags, occurred_at, summary')
        .eq('member_id', member.id)
        .eq('manager_id', user.id)
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .order('occurred_at', { ascending: true }),
      admin
        .from('meeting_transcripts')
        .select('id, leader_notes, transcript, extracted_themes, created_at')
        .eq('member_id', member.id)
        .eq('manager_id', user.id)
        .gte('created_at', start)
        .lt('created_at', end)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: true }),
    ]);

    const fbCount = feedbacks?.length ?? 0;
    const mtCount = meetings?.length ?? 0;
    const totalEvidence = fbCount + mtCount;

    if (totalEvidence === 0) {
      return new Response(
        JSON.stringify({
          error: 'Sem evidências no mês — registre ao menos uma nota ou 1:1 antes de gerar.',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const ai = await callMonthlyRecapAI(
      (member as any).name,
      (feedbacks ?? []) as any,
      (meetings ?? []) as any,
    );

    if (!ai) {
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      member_id: member.id,
      manager_id: user.id,
      workspace_id: workspaceId,
      period_month: periodMonth,
      status: 'draft' as const,
      highlight_text: ai.highlight?.text ?? '',
      highlight_evidence: ai.highlight?.evidence ?? [],
      concern_text: ai.concern?.text ?? '',
      concern_evidence: ai.concern?.evidence ?? [],
      dominant_pattern: ai.dominant_pattern ?? '',
      feedbacks_count: fbCount,
      meetings_count: mtCount,
      low_evidence: totalEvidence < 3,
      ai_generated_at: new Date().toISOString(),
      ai_model: 'google/gemini-2.5-flash',
    };

    let recapId: string;
    if (existing) {
      const { data: upd, error: updErr } = await admin
        .from('monthly_recaps')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .single();
      if (updErr) throw updErr;
      recapId = upd!.id;
    } else {
      const { data: ins, error: insErr } = await admin
        .from('monthly_recaps')
        .insert(payload)
        .select('id')
        .single();
      if (insErr) throw insErr;
      recapId = ins!.id;
    }

    return new Response(
      JSON.stringify({ ok: true, recap_id: recapId, period_month: periodMonth, evidence: { feedbacks: fbCount, meetings: mtCount } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-monthly-recap] fatal', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
