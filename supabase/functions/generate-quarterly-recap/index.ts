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
  period_quarter?: string; // ISO yyyy-mm-dd, normalized to first day of quarter
  regenerate?: boolean;
  mode?: 'auto' | 'from_raw'; // 'auto' = uses confirmed monthlies (default); 'from_raw' = fast mode from raw feedbacks
}

type Classification = 'precisa_subir' | 'dentro_esperado' | 'subindo_barra' | 'acima_esperado';
type TurnoverRisk = 'low' | 'medium' | 'high';

interface QuarterlyRecapAI {
  highlights: Array<{ title: string; detail: string; source_month: string }>;
  recurring_patterns: Array<{ pattern: string; polarity: 'positive' | 'negative'; frequency_note: string }>;
  evolution_vs_previous: string | null;
  suggested_classification: Classification;
  suggested_turnover_risk: TurnoverRisk;
  suggested_next_action_key: string;
}

function firstDayOfQuarter(d: Date): string {
  const month = d.getUTCMonth(); // 0-11
  const qStartMonth = Math.floor(month / 3) * 3;
  const y = d.getUTCFullYear();
  const m = String(qStartMonth + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function lastQuarterStart(): string {
  const now = new Date();
  const month = now.getUTCMonth();
  const qStartMonth = Math.floor(month / 3) * 3;
  // previous quarter start
  const prevQStartMonth = qStartMonth - 3;
  const y = prevQStartMonth < 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const realMonth = ((prevQStartMonth % 12) + 12) % 12;
  return firstDayOfQuarter(new Date(Date.UTC(y, realMonth, 1)));
}

function previousQuarterStart(periodQuarter: string): string {
  const [y, m] = periodQuarter.split('-').map((x) => parseInt(x, 10));
  const prevMonth = m - 3;
  if (prevMonth < 1) {
    const py = y - 1;
    const pm = String(prevMonth + 12).padStart(2, '0');
    return `${py}-${pm}-01`;
  }
  return `${y}-${String(prevMonth).padStart(2, '0')}-01`;
}

function quarterRange(periodQuarter: string): { startMonth: string; endMonth: string } {
  const [y, m] = periodQuarter.split('-').map((x) => parseInt(x, 10));
  const startMonth = `${y}-${String(m).padStart(2, '0')}-01`;
  const endMonthDate = new Date(Date.UTC(y, m + 2, 1)); // first day of month AFTER quarter
  const endY = endMonthDate.getUTCFullYear();
  const endM = String(endMonthDate.getUTCMonth() + 1).padStart(2, '0');
  const endMonth = `${endY}-${endM}-01`;
  return { startMonth, endMonth };
}

async function callQuarterlyRecapAI(
  memberName: string,
  monthlies: Array<{ id: string; period_month: string; highlight_text: string | null; concern_text: string | null; dominant_pattern: string | null }>,
  previous: { classification: Classification | null; turnover_risk: TurnoverRisk | null; dominant_summary: string | null } | null,
): Promise<QuarterlyRecapAI | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `${RHITMO_IDENTITY}

Você é o "Rhitmo Trimestral" — uma função especializada em consolidar 1-3 resumos mensais já validados pelo líder em uma calibração trimestral.

${GUARDRAILS_PROMPT}

REGRAS ESPECÍFICAS DO TRIMESTRAL:
1. Use APENAS as informações dos resumos mensais fornecidos. Não invente fatos novos.
2. **Highlights**: extraia 2-3 entregas/contribuições mais relevantes. Para cada uma, cite o mês de origem (ex: "2026-02").
3. **Recurring patterns**: identifique padrões que apareceram em 2+ meses (positivos ou negativos). Se não houver padrão recorrente, retorne array vazio.
4. **Evolution_vs_previous**: se houver dado do trimestre anterior, compare em 1 frase ("Melhora em autonomia. Atenção em prazo se mantém."). Senão, retorne null.
5. **Suggested_classification** (uma de 4):
   - "precisa_subir": Gaps recorrentes em entrega ou comportamento crítico para o cargo
   - "dentro_esperado": Cumpre o esperado consistentemente, sem destaques negativos nem excepcionais
   - "subindo_barra": Está crescendo de forma visível, entrega acima em alguns aspectos
   - "acima_esperado": Performance excepcional, padrão claro de entrega acima do nível
6. **Suggested_turnover_risk**: "low" | "medium" | "high" — baseie em sinais como queda de engagement, frustração recorrente, conflitos. Se sem sinal, "low".
7. **Suggested_next_action_key**: escolha UMA chave da matriz abaixo, alinhada à classificação:
   - Se "precisa_subir": "improvement_plan_30_60_90" | "direct_conversation" | "increase_1on1_frequency"
   - Se "dentro_esperado": "define_new_challenge" | "public_recognition" | "growth_conversation"
   - Se "subindo_barra": "high_visibility_project" | "promotion_path_conversation" | "stakeholder_exposure"
   - Se "acima_esperado": "anticipate_promotion" | "protect_from_overload" | "external_mentorship"
8. Resposta JSON válida em português brasileiro.`;

  const monthliesText = monthlies
    .map(
      (m) =>
        `[mês=${m.period_month}]
Highlight: ${m.highlight_text || '(sem destaque)'}
Concern: ${m.concern_text || '(nenhum)'}
Padrão dominante: ${m.dominant_pattern || '(não identificado)'}`,
    )
    .join('\n\n');

  const previousText = previous
    ? `Trimestre anterior:
- Classificação: ${previous.classification ?? 'não informada'}
- Risco turnover: ${previous.turnover_risk ?? 'não informado'}
- Padrão geral: ${previous.dominant_summary ?? 'não informado'}`
    : 'Trimestre anterior: (sem histórico)';

  const userPrompt = `Liderado: ${memberName}

RESUMOS MENSAIS CONFIRMADOS DO TRIMESTRE (${monthlies.length}):
${monthliesText}

${previousText}

Responda APENAS com JSON no formato:
{
  "highlights": [{"title": "...", "detail": "...", "source_month": "YYYY-MM"}],
  "recurring_patterns": [{"pattern": "...", "polarity": "positive|negative", "frequency_note": "apareceu em 2 dos 3 meses"}],
  "evolution_vs_previous": "string ou null",
  "suggested_classification": "precisa_subir|dentro_esperado|subindo_barra|acima_esperado",
  "suggested_turnover_risk": "low|medium|high",
  "suggested_next_action_key": "chave-da-matriz"
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
    console.error('[generate-quarterly-recap] AI error', res.status, txt);
    if (res.status === 429) throw new Error('AI rate limit exceeded');
    if (res.status === 402) throw new Error('AI credits exhausted');
    return null;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content) as QuarterlyRecapAI;
  } catch (e) {
    console.error('[generate-quarterly-recap] failed to parse AI JSON', e);
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

    const periodQuarter = body.period_quarter
      ? firstDayOfQuarter(new Date(body.period_quarter + 'T00:00:00Z'))
      : lastQuarterStart();

    // Resolve member
    const { data: member, error: mErr } = await admin
      .from('team_members')
      .select('id, name, team_id, teams!inner(leader_user_id, workspace_id)')
      .eq('id', body.member_id)
      .maybeSingle();
    if (mErr || !member) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const team = (member as any).teams;
    if (team?.leader_user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden — only the team leader can generate recaps' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const workspaceId = team.workspace_id as string;

    // Existing?
    const { data: existing } = await admin
      .from('quarterly_recaps')
      .select('id, status')
      .eq('member_id', member.id)
      .eq('period_quarter', periodQuarter)
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

    const { startMonth, endMonth } = quarterRange(periodQuarter);

    // Fetch confirmed monthly recaps within the quarter
    const { data: monthlies, error: monthErr } = await admin
      .from('monthly_recaps')
      .select('id, period_month, highlight_text, concern_text, dominant_pattern, feedbacks_count, meetings_count')
      .eq('member_id', member.id)
      .eq('manager_id', user.id)
      .eq('status', 'confirmed')
      .gte('period_month', startMonth)
      .lt('period_month', endMonth)
      .order('period_month', { ascending: true });

    if (monthErr) throw monthErr;

    if (!monthlies || monthlies.length === 0) {
      const [qy, qm] = periodQuarter.split('-').map((x) => parseInt(x, 10));
      const qLabel = `Q${Math.floor((qm - 1) / 3) + 1} ${qy}`;
      return new Response(
        JSON.stringify({
          error: `Confirme ao menos um Rhitmo Mensal do trimestre ${qLabel} antes de gerar o trimestral. Sem mensais confirmados, o trimestral perde a base.`,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Previous quarter (for evolution) — confirmed only
    const prevQuarter = previousQuarterStart(periodQuarter);
    const { data: prev } = await admin
      .from('quarterly_recaps')
      .select('classification, turnover_risk, recurring_patterns')
      .eq('member_id', member.id)
      .eq('period_quarter', prevQuarter)
      .eq('status', 'confirmed')
      .maybeSingle();

    const previous = prev
      ? {
          classification: prev.classification as Classification | null,
          turnover_risk: prev.turnover_risk as TurnoverRisk | null,
          dominant_summary: Array.isArray(prev.recurring_patterns)
            ? (prev.recurring_patterns as Array<{ pattern: string }>)
                .map((p) => p.pattern)
                .slice(0, 3)
                .join('; ')
            : null,
        }
      : null;

    const ai = await callQuarterlyRecapAI(
      (member as any).name,
      monthlies as any,
      previous,
    );

    if (!ai) {
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalFeedbacks = (monthlies as any[]).reduce((acc, m) => acc + (m.feedbacks_count ?? 0), 0);
    const totalMeetings = (monthlies as any[]).reduce((acc, m) => acc + (m.meetings_count ?? 0), 0);

    const payload = {
      member_id: member.id,
      manager_id: user.id,
      workspace_id: workspaceId,
      period_quarter: periodQuarter,
      status: 'draft' as const,
      highlights: ai.highlights ?? [],
      recurring_patterns: ai.recurring_patterns ?? [],
      evolution_vs_previous: ai.evolution_vs_previous ?? null,
      ai_suggested_classification: ai.suggested_classification ?? null,
      classification: null, // leader confirms
      ai_suggested_next_action_key: ai.suggested_next_action_key ?? null,
      next_action_key: null,
      turnover_risk: ai.suggested_turnover_risk ?? null,
      source_monthly_recap_ids: (monthlies as any[]).map((m) => m.id),
      source_feedbacks_count: totalFeedbacks,
      source_meetings_count: totalMeetings,
      ai_generated_at: new Date().toISOString(),
      ai_model: 'google/gemini-2.5-flash',
    };

    let recapId: string;
    if (existing) {
      const { data: upd, error: updErr } = await admin
        .from('quarterly_recaps')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .single();
      if (updErr) throw updErr;
      recapId = upd!.id;
    } else {
      const { data: ins, error: insErr } = await admin
        .from('quarterly_recaps')
        .insert(payload)
        .select('id')
        .single();
      if (insErr) throw insErr;
      recapId = ins!.id;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        recap_id: recapId,
        period_quarter: periodQuarter,
        sources: { monthlies: monthlies.length, feedbacks: totalFeedbacks, meetings: totalMeetings },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-quarterly-recap] fatal', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
