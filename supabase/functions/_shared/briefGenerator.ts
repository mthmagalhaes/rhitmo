// Shared brief generator — used by /brief web (generate-brief) and Slack
// "Gerar Pauta" button (slack-bot:prep_1on1_brief). Keeps a single source of
// truth for AI brief content + cache to avoid drift between surfaces.
import { RHITMO_IDENTITY, GUARDRAILS_PROMPT } from "./rhitmo-constitution.ts";

export interface BriefData {
  suggested_agenda: { topic: string; rationale: string }[];
  pending_items: { description: string; from_note: string; date: string }[];
  context_summary: string;
  coaching_reminder: string;
}

export interface BriefResult {
  brief: BriefData;
  member_name: string;
  member_id: string;
  meeting_title: string | null;
  meet_link: string | null;
  cached: boolean;
}

const STOPWORDS = new Set([
  'sobre','para','como','este','esta','esse','essa','dele','dela','pelos','pelas',
  'ainda','depois','antes','durante','muito','pouco','algum','alguma','nenhum',
  'nenhuma','outro','outra','todos','todas','quando','onde','porque','enquanto',
  'sendo','foram','foram','seria','serão','seriam','tinha','tinham','havia','havias',
  'estar','estão','estava','estavam','fazer','fazendo','feito','feita','vamos','vamos',
  'isso','isto','aquele','aquela','aquilo','daqui','dali','daqui','sempre','nunca',
  'também','ainda','agora','depois','antes','assim','aqui','desde','porque',
]);

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywords(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 4 && !STOPWORDS.has(w));
}

export interface MatchedAgendaItem {
  topic: string;
  rationale: string;
  pendings: { description: string; from_note: string; date: string }[];
}

export interface MatchedBrief {
  agenda: MatchedAgendaItem[];
  unmatched_pendings: { description: string; from_note: string; date: string }[];
}

/** Heuristic: attach each pending item to the agenda topic with the most
 *  shared keywords. If none match, it falls into unmatched_pendings. */
export function matchPendingToAgenda(brief: BriefData): MatchedBrief {
  const agenda: MatchedAgendaItem[] = brief.suggested_agenda.map((a) => ({
    topic: a.topic,
    rationale: a.rationale,
    pendings: [],
  }));
  const unmatched: { description: string; from_note: string; date: string }[] = [];

  const agendaKeywords = agenda.map((a) =>
    new Set(keywords(`${a.topic} ${a.rationale}`)),
  );

  for (const p of brief.pending_items || []) {
    const pKw = keywords(`${p.description} ${p.from_note}`);
    let bestIdx = -1;
    let bestScore = 0;
    agendaKeywords.forEach((set, i) => {
      let score = 0;
      for (const k of pKw) if (set.has(k)) score++;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && bestScore >= 1) {
      agenda[bestIdx].pendings.push(p);
    } else {
      unmatched.push(p);
    }
  }

  return { agenda, unmatched_pendings: unmatched };
}

/** Generate (or load from 30-min cache) the AI brief for a given upcoming
 *  meeting. Caller is responsible for ownership/auth checks before invoking. */
export async function generateBriefForMeeting(
  meetingId: string,
  expectedUserId: string,
  adminClient: any,
  lovableApiKey: string | undefined,
): Promise<BriefResult> {
  // 1. Fetch meeting (full row — caller already authorized)
  const { data: meeting, error: meetingErr } = await adminClient
    .from('upcoming_meetings')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (meetingErr || !meeting) {
    throw new Error('Meeting not found');
  }
  if (meeting.user_id !== expectedUserId) {
    throw new Error('Forbidden');
  }
  if (!meeting.member_id) {
    throw new Error('Meeting has no linked member');
  }

  // 2. Fetch member
  const { data: member } = await adminClient
    .from('team_members')
    .select('id, name, role')
    .eq('id', meeting.member_id)
    .single();

  const memberName = member?.name ?? 'Liderado';
  const memberRole = member?.role ?? '';

  // 3. Cache (30 min)
  if (meeting.brief_cache && meeting.brief_generated_at) {
    const generatedAt = new Date(meeting.brief_generated_at).getTime();
    if (generatedAt > Date.now() - 30 * 60 * 1000) {
      return {
        brief: meeting.brief_cache as BriefData,
        member_name: memberName,
        member_id: meeting.member_id,
        meeting_title: meeting.title ?? null,
        meet_link: meeting.meet_link ?? null,
        cached: true,
      };
    }
  }

  // 4. Pending action items from last 10 feedbacks
  const { data: feedbacks } = await adminClient
    .from('feedbacks')
    .select('action_items, title, occurred_at')
    .eq('member_id', meeting.member_id)
    .neq('action_items', '[]')
    .order('occurred_at', { ascending: false })
    .limit(10);

  const pendingItems: { description: string; from_note: string; date: string }[] = [];
  if (feedbacks) {
    for (const fb of feedbacks) {
      const items = fb.action_items as any[];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (item.status === 'done') continue;
        pendingItems.push({
          description: item.text || item.description || String(item),
          from_note: fb.title || 'Nota sem título',
          date: fb.occurred_at ? new Date(fb.occurred_at).toLocaleDateString('pt-BR') : '',
        });
        if (pendingItems.length >= 10) break;
      }
      if (pendingItems.length >= 10) break;
    }
  }

  // 5. Last 5 notes for context
  const { data: recentNotes } = await adminClient
    .from('feedbacks')
    .select('title, content, occurred_at')
    .eq('member_id', meeting.member_id)
    .order('occurred_at', { ascending: false })
    .limit(5);

  const notesContext = (recentNotes || [])
    .map(
      (n: any) =>
        `- [${new Date(n.occurred_at).toLocaleDateString('pt-BR')}] ${n.title || 'Sem título'}: ${(n.content || '').substring(0, 300)}`,
    )
    .join('\n');

  const pendingContext =
    pendingItems.length > 0
      ? pendingItems.map((p) => `- ${p.description} (de: ${p.from_note}, ${p.date})`).join('\n')
      : 'Nenhuma pendência identificada.';

  // 5b. Network context (Sprint 14 — ONA-enriched brief, graceful fallback)
  let networkContext = '';
  try {
    const { data: edges } = await adminClient
      .from('team_network_edges')
      .select('member_a_id, member_b_id, weight_total, sources')
      .eq('window_days', 30)
      .or(`member_a_id.eq.${meeting.member_id},member_b_id.eq.${meeting.member_id}`)
      .order('weight_total', { ascending: false })
      .limit(5);

    const peerIds = (edges ?? [])
      .map((e: any) => (e.member_a_id === meeting.member_id ? e.member_b_id : e.member_a_id))
      .filter(Boolean);

    if (peerIds.length > 0) {
      const { data: peers } = await adminClient
        .from('team_members')
        .select('id, name')
        .in('id', peerIds);
      const names = (peers ?? []).map((p: any) => p.name).filter(Boolean).slice(0, 3);
      if (names.length > 0) {
        networkContext = `Top colaboradores reais nos últimos 30 dias: ${names.join(', ')}.`;
      }
    }

    const { data: signals } = await adminClient
      .from('network_signals')
      .select('signal_type, severity, payload')
      .eq('member_id', meeting.member_id)
      .is('acknowledged_at', null)
      .order('detected_at', { ascending: false })
      .limit(3);

    if (signals && signals.length > 0) {
      const sigText = signals
        .map((s: any) => `${s.signal_type} (${s.severity})`)
        .join(', ');
      networkContext = (networkContext ? networkContext + ' ' : '') + `Sinais ativos: ${sigText}.`;
    }
  } catch (err) {
    console.warn('[briefGenerator] network context skipped:', err);
  }

  const startFormatted = new Date(meeting.start_time).toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  if (!lovableApiKey) {
    throw new Error('AI not configured');
  }

  const userPrompt = `Você está preparando um brief pré-reunião para o líder.

Reunião: ${meeting.title || '1:1'} com ${memberName} (${memberRole})
Data/hora: ${startFormatted}

Histórico recente (últimas notas):
${notesContext || 'Nenhuma nota registrada ainda.'}

Action items pendentes:
${pendingContext}
${networkContext ? `\nContexto de rede (colaboração real):\n${networkContext}\nUse isso para enriquecer o context_summary se for relevante. Tom humano, sem jargão.` : ''}

Gere um brief estruturado usando a função generate_brief.
Máximo 3 itens de agenda. Máximo 5 pendências.
Baseie-se APENAS nas notas fornecidas. Se não há notas, sugira tópicos genéricos de 1:1 como check-in de bem-estar e alinhamento de prioridades.`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: RHITMO_IDENTITY + '\n' + GUARDRAILS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_brief',
            description: 'Generate a structured pre-meeting brief',
            parameters: {
              type: 'object',
              properties: {
                suggested_agenda: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      topic: { type: 'string' },
                      rationale: { type: 'string' },
                    },
                    required: ['topic', 'rationale'],
                    additionalProperties: false,
                  },
                },
                pending_items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      from_note: { type: 'string' },
                      date: { type: 'string' },
                    },
                    required: ['description', 'from_note', 'date'],
                    additionalProperties: false,
                  },
                },
                context_summary: { type: 'string' },
                coaching_reminder: { type: 'string' },
              },
              required: ['suggested_agenda', 'pending_items', 'context_summary', 'coaching_reminder'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'generate_brief' } },
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('[briefGenerator] AI error:', aiResponse.status, errorText);
    if (aiResponse.status === 429) throw new Error('Rate limit exceeded');
    if (aiResponse.status === 402) throw new Error('AI credits exhausted');
    throw new Error('AI generation failed');
  }

  const aiData = await aiResponse.json();
  let brief: BriefData;
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    brief = JSON.parse(toolCall.function.arguments) as BriefData;
  } else {
    const content = aiData.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      brief = JSON.parse(jsonMatch[0]) as BriefData;
    } else {
      brief = {
        suggested_agenda: [{ topic: 'Check-in geral', rationale: 'Alinhar prioridades da semana' }],
        pending_items: [],
        context_summary: 'Sem histórico suficiente para gerar contexto detalhado.',
        coaching_reminder: 'Comece a reunião perguntando como o liderado está se sentindo.',
      };
    }
  }

  // 6. Cache
  await adminClient
    .from('upcoming_meetings')
    .update({
      brief_cache: brief,
      brief_generated_at: new Date().toISOString(),
    })
    .eq('id', meetingId);

  return {
    brief,
    member_name: memberName,
    member_id: meeting.member_id,
    meeting_title: meeting.title ?? null,
    meet_link: meeting.meet_link ?? null,
    cached: false,
  };
}

/** Convert a BriefData into Slack Block Kit blocks. Used by slack-bot for
 *  the "Gerar Pauta" button so Slack and web stay in sync. */
export function briefToSlackBlocks(
  brief: BriefData,
  ctx: { memberName: string; meetingId: string; meetingTitle: string | null; meetLink: string | null },
): unknown[] {
  const matched = matchPendingToAgenda(brief);

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📊 Brief — ${ctx.memberName}` },
    },
  ];

  if (ctx.meetingTitle) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_${ctx.meetingTitle}_` }],
    });
  }

  blocks.push({ type: 'divider' });

  // Leitura do momento
  if (brief.context_summary) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `🧠 *Leitura do momento*\n${brief.context_summary}` },
    });
  }

  // Pauta sugerida
  if (matched.agenda.length) {
    let agendaText = '📋 *Pauta sugerida*\n';
    matched.agenda.forEach((a, i) => {
      agendaText += `\n*${i + 1}. ${a.topic}*\n_${a.rationale}_\n`;
      a.pendings.forEach((p) => {
        agendaText += `   ⚠ pendente desde ${p.date} — ${p.description}\n`;
      });
    });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: agendaText.trim() } });
  }

  // Pendências sem match
  if (matched.unmatched_pendings.length) {
    let extraText = '*⚠ Outras pendências*\n';
    matched.unmatched_pendings.forEach((p) => {
      extraText += `• ${p.description} _(de ${p.from_note}, ${p.date})_\n`;
    });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: extraText.trim() } });
  }

  // Como conduzir
  if (brief.coaching_reminder) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `💡 *Como conduzir*\n${brief.coaching_reminder}` },
    });
  }

  // Ações
  const actionElements: unknown[] = [
    {
      type: 'button',
      text: { type: 'plain_text', text: '🚀 Abrir no Rhitmo' },
      url: `https://rhitmo.co/brief/${ctx.meetingId}`,
      action_id: 'open_brief_web',
    },
  ];
  if (ctx.meetLink) {
    actionElements.push({
      type: 'button',
      text: { type: 'plain_text', text: '📹 Abrir Meet' },
      url: ctx.meetLink,
      action_id: 'open_meet_link',
    });
  }
  blocks.push({ type: 'actions', elements: actionElements });

  return blocks;
}
