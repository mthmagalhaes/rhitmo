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
  // Legacy: full quarter (Sprint <17). Still supported.
  period_quarter?: string;
  // Sprint 17+: arbitrary period [period_start, period_end]
  period_start?: string; // YYYY-MM-DD
  period_end?: string;   // YYYY-MM-DD (inclusive UI; treated as exclusive upper bound for queries)
  period_label?: string; // optional human label ("Último mês", "Personalizado 12/02–05/05"...)
  regenerate?: boolean;
  mode?: 'auto' | 'from_raw';
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

async function callQuarterlyRecapFromRawAI(
  memberName: string,
  feedbacks: Array<{ id: string; content: string; type: string; sentiment: string | null; tags: string[] | null; occurred_at: string; summary: string | null }>,
  meetings: Array<{ id: string; leader_notes: string | null; extracted_themes: string[] | null; created_at: string }>,
  contextEvidence: Array<{ id: string; evidence_type: string; occurred_at: string; title: string | null; summary: string | null; leader_edited_summary: string | null; metadata: any }>,
  previous: { classification: Classification | null; turnover_risk: TurnoverRisk | null; dominant_summary: string | null } | null,
): Promise<QuarterlyRecapAI | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `${RHITMO_IDENTITY}

Você é o "Rhitmo Trimestral — Modo Rápido". O líder NÃO confirmou os resumos mensais, então você está consolidando feedbacks e notas brutas do trimestre direto. Por isso, redobre o rigor anti-alucinação.

${GUARDRAILS_PROMPT}

REGRAS CRÍTICAS DO MODO RÁPIDO:
1. **Cada highlight DEVE referenciar pelo menos 1 feedback_id real do trimestre.** Use o mês do occurred_at como source_month (formato YYYY-MM).
2. **Padrão recorrente** só conta como recurring_pattern se aparecer em pelo menos 2 evidências distintas. Senão, deixe array vazio. Não invente padrões.
3. Linguagem factual e seca. Sem "incrível", "preocupante demais". Use "entregou X", "atrasou Y".
4. Foque APENAS em ações de ${memberName}.
5. Como você está olhando dados brutos sem curadoria humana, seja CONSERVADOR na classificação — prefira "dentro_esperado" se não houver sinal forte.
6. **Contexto agregado (Slack, pulses, sinais de rede, peer feedback)**: trate como sinal ambiental — pode reforçar padrões observados em feedbacks/1:1s, mas NÃO conta sozinho como highlight. Resumos do Slack são agregados, nunca cite mensagens cruas.
7. Resposta JSON válida em português brasileiro.

Mesma estrutura do trimestral padrão: highlights, recurring_patterns, evolution_vs_previous, suggested_classification, suggested_turnover_risk, suggested_next_action_key.

Matriz de next_action_key (escolha UMA conforme classificação):
- "precisa_subir": "improvement_plan_30_60_90" | "direct_conversation" | "increase_1on1_frequency"
- "dentro_esperado": "define_new_challenge" | "public_recognition" | "growth_conversation"
- "subindo_barra": "high_visibility_project" | "promotion_path_conversation" | "stakeholder_exposure"
- "acima_esperado": "anticipate_promotion" | "protect_from_overload" | "external_mentorship"`;

  const feedbacksText = feedbacks.length > 0
    ? feedbacks.map((f) => `[feedback_id=${f.id} | ${f.occurred_at.slice(0, 10)} | type=${f.type} | sentiment=${f.sentiment ?? '?'}]\n${f.summary || f.content.slice(0, 400)}`).join('\n\n')
    : '(sem feedbacks no período)';

  const meetingsText = meetings.length > 0
    ? meetings.map((m) => `[meeting_id=${m.id} | ${m.created_at.slice(0, 10)}]\nNotas líder: ${m.leader_notes?.slice(0, 400) || '(vazio)'}`).join('\n\n')
    : '(sem 1:1s registrados no período)';

  const previousText = previous
    ? `Trimestre anterior:\n- Classificação: ${previous.classification ?? 'não informada'}\n- Risco turnover: ${previous.turnover_risk ?? 'não informado'}\n- Padrão geral: ${previous.dominant_summary ?? 'não informado'}`
    : 'Trimestre anterior: (sem histórico)';

  const userPrompt = `Liderado: ${memberName}

DADOS BRUTOS DO TRIMESTRE (modo rápido — sem curadoria mensal):

## FEEDBACKS / NOTAS (${feedbacks.length}):
${feedbacksText}

## 1:1s (${meetings.length}):
${meetingsText}

${previousText}

Responda APENAS com JSON no formato:
{
  "highlights": [{"title": "...", "detail": "...", "source_month": "YYYY-MM"}],
  "recurring_patterns": [{"pattern": "...", "polarity": "positive|negative", "frequency_note": "apareceu em N evidências"}],
  "evolution_vs_previous": "string ou null",
  "suggested_classification": "precisa_subir|dentro_esperado|subindo_barra|acima_esperado",
  "suggested_turnover_risk": "low|medium|high",
  "suggested_next_action_key": "chave-da-matriz"
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[generate-quarterly-recap from_raw] AI error', res.status, txt);
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
      console.error('[generate-quarterly-recap from_raw] failed to parse AI JSON', e);
      return null;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Sprint 17: allow internal invocation (Slack bot, cron) via x-cron-secret + body.acting_user_id
    const cronSecret = req.headers.get('x-cron-secret');
    const internalSecret = Deno.env.get('CRON_SECRET');
    const isInternal = !!cronSecret && !!internalSecret && cronSecret === internalSecret;

    let actingUserId: string | null = null;
    if (isInternal) {
      const peek = await req.clone().json().catch(() => ({} as any));
      actingUserId = peek?.acting_user_id ?? null;
      if (!actingUserId) {
        return new Response(JSON.stringify({ error: 'acting_user_id required for internal calls' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      actingUserId = user.id;
    }

    const body = (await req.json()) as Body & { acting_user_id?: string };
    if (!body?.member_id) {
      return new Response(JSON.stringify({ error: 'member_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Sprint 17: resolve period (period_start/end take priority; fallback to legacy period_quarter; fallback to lastClosedQuarter)
    let periodStart: string;
    let periodEnd: string;
    let periodLabel: string;
    let legacyPeriodQuarter: string | null = null;

    if (body.period_start && body.period_end) {
      // normalize to date-only strings
      periodStart = body.period_start.slice(0, 10);
      periodEnd = body.period_end.slice(0, 10);
      periodLabel = body.period_label ?? `${periodStart} – ${periodEnd}`;
    } else {
      const pq = body.period_quarter
        ? firstDayOfQuarter(new Date(body.period_quarter + 'T00:00:00Z'))
        : lastQuarterStart();
      legacyPeriodQuarter = pq;
      const r = quarterRange(pq);
      periodStart = r.startMonth;
      periodEnd = r.endMonth;
      const [py, pm] = pq.split('-').map((x) => parseInt(x, 10));
      periodLabel = body.period_label ?? `Q${Math.floor((pm - 1) / 3) + 1} ${py}`;
    }

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
    if (team?.leader_user_id !== actingUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden — only the team leader can generate recaps' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const workspaceId = team.workspace_id as string;

    // Existing? Now keyed by (member_id, period_start, period_end)
    const { data: existing } = await admin
      .from('quarterly_recaps')
      .select('id, status')
      .eq('member_id', member.id)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
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

    const startMonth = periodStart;
    const endMonth = periodEnd;
    const mode = body.mode === 'from_raw' ? 'from_raw' : 'auto';

    // Previous period (for evolution): most recent confirmed recap ending on/before periodStart
    const { data: prev } = await admin
      .from('quarterly_recaps')
      .select('classification, turnover_risk, recurring_patterns')
      .eq('member_id', member.id)
      .eq('status', 'confirmed')
      .lte('period_end', periodStart)
      .order('period_end', { ascending: false })
      .limit(1)
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

    let ai: QuarterlyRecapAI | null = null;
    let sourceMonthlyIds: string[] = [];
    let totalFeedbacks = 0;
    let totalMeetings = 0;
    let generationMode: 'from_monthly' | 'from_raw' = 'from_monthly';

    if (mode === 'auto') {
      const { data: monthlies, error: monthErr } = await admin
        .from('monthly_recaps')
        .select('id, period_month, highlight_text, concern_text, dominant_pattern, feedbacks_count, meetings_count')
        .eq('member_id', member.id)
        .eq("manager_id", actingUserId)
        .eq('status', 'confirmed')
        .gte('period_month', startMonth)
        .lt('period_month', endMonth)
        .order('period_month', { ascending: true });

      if (monthErr) throw monthErr;

      if (!monthlies || monthlies.length === 0) {
        return new Response(
          JSON.stringify({
            error: `Sem Rhitmo Mensal confirmado no período (${periodLabel}). Confirme ao menos um mensal ou use o modo rápido.`,
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      ai = await callQuarterlyRecapAI((member as any).name, monthlies as any, previous);
      sourceMonthlyIds = (monthlies as any[]).map((m) => m.id);
      totalFeedbacks = (monthlies as any[]).reduce((acc, m) => acc + (m.feedbacks_count ?? 0), 0);
      totalMeetings = (monthlies as any[]).reduce((acc, m) => acc + (m.meetings_count ?? 0), 0);
      generationMode = 'from_monthly';
    } else {
      // FROM_RAW: pull raw feedbacks + 1:1s of the quarter directly
      const startIso = new Date(startMonth + 'T00:00:00Z').toISOString();
      const endIso = new Date(endMonth + 'T00:00:00Z').toISOString();
      const [{ data: feedbacks }, { data: meetings }] = await Promise.all([
        admin
          .from('feedbacks')
          .select('id, content, type, sentiment, tags, occurred_at, summary')
          .eq('member_id', member.id)
          .eq("manager_id", actingUserId)
          .gte('occurred_at', startIso)
          .lt('occurred_at', endIso)
          .order('occurred_at', { ascending: true })
          .limit(40),
        admin
          .from('meeting_transcripts')
          .select('id, leader_notes, extracted_themes, created_at')
          .eq('member_id', member.id)
          .eq("manager_id", actingUserId)
          .gte('created_at', startIso)
          .lt('created_at', endIso)
          .eq('processing_status', 'completed')
          .order('created_at', { ascending: true })
          .limit(15),
      ]);

      const fbList = feedbacks ?? [];
      const mtList = meetings ?? [];
      if (fbList.length === 0 && mtList.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Nenhum feedback ou 1:1 encontrado no trimestre. Registre evidências antes de tentar o modo rápido.',
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      ai = await callQuarterlyRecapFromRawAI((member as any).name, fbList as any, mtList as any, previous);
      totalFeedbacks = fbList.length;
      totalMeetings = mtList.length;
      generationMode = 'from_raw';
    }

    if (!ai) {
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sprint 16 — enrich Rhitmo Trimestral with peer voices + network context
    const startIso = new Date(startMonth + 'T00:00:00Z').toISOString();
    const endIso = new Date(endMonth + 'T00:00:00Z').toISOString();
    let peerVoices: Array<{ request_id: string; peer_member_id: string | null; peer_name: string; text: string; responded_at: string; edge_strength: number | null }> = [];
    let networkContext: { signals: Array<{ id: string; signal_type: string; severity: string; detected_at: string; payload: any }>; total_active: number } = { signals: [], total_active: 0 };
    try {
      const [{ data: pfr }, { data: signals }] = await Promise.all([
        admin
          .from('peer_feedback_requests')
          .select('id, peer_member_id, response_text, responded_at, edge_strength_at_request, team_members:peer_member_id(name)')
          .eq('subject_member_id', member.id)
          .eq('status', 'answered')
          .gte('responded_at', startIso)
          .lt('responded_at', endIso)
          .order('responded_at', { ascending: false })
          .limit(3),
        admin
          .from('network_signals')
          .select('id, signal_type, severity, detected_at, payload')
          .eq('member_id', member.id)
          .gte('detected_at', startIso)
          .lt('detected_at', endIso)
          .order('detected_at', { ascending: false })
          .limit(3),
      ]);
      peerVoices = (pfr ?? []).map((r: any) => ({
        request_id: r.id,
        peer_member_id: r.peer_member_id ?? null,
        peer_name: r.team_members?.name ?? 'Par',
        text: r.response_text || '',
        responded_at: r.responded_at,
        edge_strength: r.edge_strength_at_request ?? null,
      }));
      networkContext = {
        signals: (signals ?? []).map((s: any) => ({
          id: s.id,
          signal_type: s.signal_type,
          severity: s.severity,
          detected_at: s.detected_at,
          payload: s.payload ?? {},
        })),
        total_active: (signals ?? []).length,
      };
    } catch (enrichErr) {
      console.error('[generate-quarterly-recap] enrichment soft-fail', enrichErr);
    }

    const payload = {
      member_id: member.id,
      manager_id: actingUserId,
      workspace_id: workspaceId,
      // Sprint 17: keep period_quarter for legacy reads (only when generated from a quarter-aligned input)
      period_quarter: legacyPeriodQuarter,
      period_start: periodStart,
      period_end: periodEnd,
      period_label: periodLabel,
      status: 'draft' as const,
      highlights: ai.highlights ?? [],
      recurring_patterns: ai.recurring_patterns ?? [],
      evolution_vs_previous: ai.evolution_vs_previous ?? null,
      ai_suggested_classification: ai.suggested_classification ?? null,
      classification: null,
      ai_suggested_next_action_key: ai.suggested_next_action_key ?? null,
      next_action_key: null,
      turnover_risk: ai.suggested_turnover_risk ?? null,
      source_monthly_recap_ids: sourceMonthlyIds,
      source_feedbacks_count: totalFeedbacks,
      source_meetings_count: totalMeetings,
      ai_generated_at: new Date().toISOString(),
      ai_model: 'google/gemini-2.5-flash',
      generation_mode: generationMode,
      peer_voices: peerVoices,
      network_context: networkContext,
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
        period_start: periodStart,
        period_end: periodEnd,
        period_label: periodLabel,
        generation_mode: generationMode,
        sources: { monthlies: sourceMonthlyIds.length, feedbacks: totalFeedbacks, meetings: totalMeetings },
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
