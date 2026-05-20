// Slack Ambient Classifier — Sprint 1
// Cron diário (3h BRT / 06:00 UTC) que:
// 1. Lista canais de cada workspace, autojoin nos públicos
// 2. Busca conversations.history desde último run
// 3. Filtra ruído (regex/length/bots)
// 4. Resolve autor via email -> team_members
// 5. Classifica via Gemini Flash Lite em batch
// 6. Persiste evidências com status=pending

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { validateCronSecret } from '../_shared/cronAuth.ts';
import { getAdminClient, startAutomationRun } from '../_shared/automationRun.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const SLACK_API = 'https://slack.com/api';
const LOVABLE_AI = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash-lite';
const MAX_MESSAGES_PER_CHANNEL = 200;
const RELEVANCE_THRESHOLD = 0.6;
const BATCH_SIZE = 20;
const MAX_THREADS_PER_CHANNEL = 20;
const MAX_REPLIES_PER_THREAD = 50;
const MIN_TEXT_LENGTH = 8;
const REACTION_MIN_COUNT = 3;

// ── Slack helpers ─────────────────────────────────────────
async function slackCall(token: string, method: string, params: Record<string, string> = {}) {
  const url = new URL(`${SLACK_API}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let attempts = 0;
  while (attempts < 3) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 429) {
      const retry = parseInt(res.headers.get('retry-after') ?? '5', 10);
      await new Promise((r) => setTimeout(r, retry * 1000));
      attempts++;
      continue;
    }
    const json = await res.json();
    if (!json.ok && json.error === 'ratelimited') {
      await new Promise((r) => setTimeout(r, 5000));
      attempts++;
      continue;
    }
    return json;
  }
  return { ok: false, error: 'rate_limit_exceeded' };
}

async function listAllChannels(token: string): Promise<any[]> {
  const channels: any[] = [];
  let cursor = '';
  do {
    const params: Record<string, string> = {
      limit: '200',
      types: 'public_channel,private_channel',
      exclude_archived: 'true',
    };
    if (cursor) params.cursor = cursor;
    const json = await slackCall(token, 'conversations.list', params);
    if (!json.ok) break;
    channels.push(...(json.channels ?? []));
    cursor = json.response_metadata?.next_cursor ?? '';
  } while (cursor);
  return channels;
}

async function fetchHistory(
  token: string,
  channelId: string,
  oldest: number,
): Promise<any[]> {
  const messages: any[] = [];
  let cursor = '';
  let page = 0;
  do {
    const params: Record<string, string> = {
      channel: channelId,
      limit: '100',
      oldest: String(oldest),
    };
    if (cursor) params.cursor = cursor;
    const json = await slackCall(token, 'conversations.history', params);
    if (!json.ok) {
      console.log(`[history] channel=${channelId} error=${json.error}`);
      break;
    }
    messages.push(...(json.messages ?? []));
    cursor = json.response_metadata?.next_cursor ?? '';
    page++;
    if (messages.length >= MAX_MESSAGES_PER_CHANNEL || page >= 3) break;
  } while (cursor);
  return messages;
}

// ── Noise filters (cheap) ─────────────────────────────────
const NOISE_PATTERNS = [
  /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u, // emoji-only
  /^https?:\/\/\S+$/, // url-only
  /^<https?:\/\/[^>]+>$/, // slack-formatted url-only
  /^[!\?\.\,]+$/, // punctuation-only
];

function isNoise(text: string | undefined, hasBotId: boolean): boolean {
  if (!text || hasBotId) return true;
  const trimmed = text.trim();
  if (trimmed.length < MIN_TEXT_LENGTH) return true;
  if (trimmed.length > 2000) return true; // long copy-paste, low signal
  for (const re of NOISE_PATTERNS) if (re.test(trimmed)) return true;
  return false;
}

// Subtypes que ainda contêm texto humano relevante
const ALLOWED_SUBTYPES = new Set(['thread_broadcast', 'file_share', 'me_message']);

function isDroppedSubtype(subtype: string | undefined): boolean {
  if (!subtype) return false;
  return !ALLOWED_SUBTYPES.has(subtype);
}

// Extrai IDs de usuários Slack mencionados no texto (<@U…>)
function extractMentions(text: string | undefined): string[] {
  if (!text) return [];
  const matches = text.matchAll(/<@([UW][A-Z0-9]+)>/g);
  const ids = new Set<string>();
  for (const m of matches) ids.add(m[1]);
  return [...ids];
}

async function fetchReplies(
  token: string,
  channelId: string,
  threadTs: string,
): Promise<any[]> {
  const json = await slackCall(token, 'conversations.replies', {
    channel: channelId,
    ts: threadTs,
    limit: String(MAX_REPLIES_PER_THREAD),
  });
  if (!json.ok) return [];
  const all = (json.messages ?? []) as any[];
  // Remove a raiz; já foi tratada via history
  return all.filter((m) => m.ts !== threadTs);
}

// ── Member resolution ─────────────────────────────────────
interface ResolvedAuthor {
  member_id: string;
  manager_id: string;
  workspace_id: string;
}

async function resolveAuthor(
  admin: SupabaseClient,
  slackToken: string,
  workspaceId: string,
  slackUserId: string,
  cache: Map<string, ResolvedAuthor | null>,
): Promise<ResolvedAuthor | null> {
  const cacheKey = `${workspaceId}:${slackUserId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  // 1. Try cached slack_user_id
  const { data: byCached } = await admin
    .from('team_members')
    .select('id, teams!inner(id, leader_user_id, workspace_id)')
    .eq('slack_user_id', slackUserId)
    .eq('teams.workspace_id', workspaceId)
    .maybeSingle();

  if (byCached && (byCached as any).teams?.leader_user_id) {
    const resolved: ResolvedAuthor = {
      member_id: byCached.id as string,
      manager_id: (byCached as any).teams.leader_user_id,
      workspace_id: workspaceId,
    };
    cache.set(cacheKey, resolved);
    return resolved;
  }

  // 2. Lookup email via Slack
  const userInfo = await slackCall(slackToken, 'users.info', { user: slackUserId });
  if (!userInfo.ok) {
    cache.set(cacheKey, null);
    return null;
  }
  const email = userInfo.user?.profile?.email as string | undefined;
  if (!email) {
    cache.set(cacheKey, null);
    return null;
  }

  // 3. Match by email within workspace
  const { data: byEmail } = await admin
    .from('team_members')
    .select('id, teams!inner(id, leader_user_id, workspace_id)')
    .ilike('email', email)
    .eq('teams.workspace_id', workspaceId)
    .maybeSingle();

  if (!byEmail || !(byEmail as any).teams?.leader_user_id) {
    cache.set(cacheKey, null);
    return null;
  }

  // 4. Persist slack_user_id for future runs
  await admin
    .from('team_members')
    .update({ slack_user_id: slackUserId })
    .eq('id', byEmail.id);

  const resolved: ResolvedAuthor = {
    member_id: byEmail.id as string,
    manager_id: (byEmail as any).teams.leader_user_id,
    workspace_id: workspaceId,
  };
  cache.set(cacheKey, resolved);
  return resolved;
}

// ── LLM classification ────────────────────────────────────
interface ClassificationInput {
  idx: number;
  text: string;
  channel_name: string;
  author_name?: string;
  thread_context?: string; // multi-line "Autor: mensagem" das últimas N msgs da thread
}

interface ClassificationResult {
  idx: number;
  relevance_score: number;
  category: 'entrega' | 'bloqueio' | 'reconhecimento' | 'conflito' | 'outro';
  summary: string;
  executive_summary?: string;
  key_quote?: string;
  thread_topic?: string;
  theme_tags?: string[];
}

async function classifyBatch(
  apiKey: string,
  inputs: ClassificationInput[],
): Promise<ClassificationResult[]> {
  const prompt = `Você é a Rhitmo analisando mensagens de Slack para extrair evidências de gestão úteis para o líder. Para cada item, considere a mensagem ALVO no contexto da thread inteira (quando houver). Mensagens curtas tipo "mandou bem", "ok", "vou alterar" só fazem sentido com o contexto. Retorne um array JSON. Cada item:

- idx: índice original
- relevance_score: 0.0 a 1.0
- category: "entrega" | "bloqueio" | "reconhecimento" | "conflito" | "outro"
- summary: 1 frase neutra, terceira pessoa, fato concreto (PT-BR)
- thread_topic: 3 a 6 palavras descrevendo o assunto da thread (ex: "Aditivo contrato cliente Acme", "Bug copy de tarefa anterior")
- theme_tags: array de 1 a 3 tags curtas em snake_case (ex: ["churn","cliente_acme","operacoes"])
- executive_summary: 1 a 2 frases para o LÍDER ler — o que aconteceu na thread + por que importa pra gestão. Foque no ângulo gerencial (risco, entrega, dinâmica de time), não em descrever a mensagem.
- key_quote: a frase mais representativa da thread, citada literalmente entre aspas. Pode ser da mensagem alvo OU de outra mensagem da thread se for mais reveladora. Máx 180 chars.

Alta relevância (>=0.6): entrega concreta, bloqueio/risco explícito, reconhecimento explícito, conflito/tensão, decisão importante.
Baixa (<0.6): small talk, memes, status genérico sem contexto.

Retorne APENAS o array JSON, sem texto extra.

Itens:
${JSON.stringify(inputs, null, 2)}`;

  const res = await fetch(LOVABLE_AI, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    console.error('[LLM] HTTP', res.status, await res.text());
    return [];
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? '[]';
  try {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed) ? parsed : (parsed.results ?? parsed.data ?? []);
    return arr.filter(
      (r: any) =>
        typeof r.idx === 'number' &&
        typeof r.relevance_score === 'number' &&
        typeof r.summary === 'string',
    );
  } catch (e) {
    console.error('[LLM] parse error', e, content.slice(0, 200));
    return [];
  }
}

// ── Workspace processor ───────────────────────────────────
interface WorkspaceStats {
  channels_total: number;
  channels_excluded: number;
  channels_already_member: number;
  channels_autojoin_ok: number;
  channels_autojoin_failed: number;
  channels_skipped_private: number;
  channels_with_messages: number;
  messages_fetched: number;
  threads_fetched: number;
  thread_replies_added: number;
  messages_dropped_bot: number;
  messages_dropped_subtype: number;
  messages_dropped_noise: number;
  messages_dropped_no_user: number;
  messages_dropped_unresolved_author: number;
  authors_resolved_cached: number;
  authors_resolved_email_match: number;
  authors_unresolved_no_email: number;
  authors_unresolved_email_not_in_team: number;
  candidates: number;
  llm_calls: number;
  llm_returned: number;
  llm_above_threshold: number;
  mention_evidence_added: number;
  reaction_evidence_added: number;
  saved: number;
  duplicates: number;
  errors: number;
}

function emptyStats(): WorkspaceStats {
  return {
    channels_total: 0, channels_excluded: 0, channels_already_member: 0,
    channels_autojoin_ok: 0, channels_autojoin_failed: 0, channels_skipped_private: 0,
    channels_with_messages: 0, messages_fetched: 0,
    threads_fetched: 0, thread_replies_added: 0,
    messages_dropped_bot: 0, messages_dropped_subtype: 0, messages_dropped_noise: 0,
    messages_dropped_no_user: 0, messages_dropped_unresolved_author: 0,
    authors_resolved_cached: 0, authors_resolved_email_match: 0,
    authors_unresolved_no_email: 0, authors_unresolved_email_not_in_team: 0,
    candidates: 0, llm_calls: 0, llm_returned: 0, llm_above_threshold: 0,
    mention_evidence_added: 0, reaction_evidence_added: 0,
    saved: 0, duplicates: 0, errors: 0,
  };
}

// Instrumented author resolver — counts reasons for misses
async function resolveAuthorInstr(
  admin: SupabaseClient,
  slackToken: string,
  workspaceId: string,
  slackUserId: string,
  cache: Map<string, ResolvedAuthor | null>,
  stats: WorkspaceStats,
): Promise<ResolvedAuthor | null> {
  const cacheKey = `${workspaceId}:${slackUserId}`;
  if (cache.has(cacheKey)) {
    const v = cache.get(cacheKey) ?? null;
    if (v) stats.authors_resolved_cached++;
    return v;
  }
  const { data: byCached } = await admin
    .from('team_members')
    .select('id, teams!inner(id, leader_user_id, workspace_id)')
    .eq('slack_user_id', slackUserId)
    .eq('teams.workspace_id', workspaceId)
    .maybeSingle();
  if (byCached && (byCached as any).teams?.leader_user_id) {
    const resolved: ResolvedAuthor = {
      member_id: byCached.id as string,
      manager_id: (byCached as any).teams.leader_user_id,
      workspace_id: workspaceId,
    };
    cache.set(cacheKey, resolved);
    stats.authors_resolved_cached++;
    return resolved;
  }
  const userInfo = await slackCall(slackToken, 'users.info', { user: slackUserId });
  const email = userInfo.ok ? (userInfo.user?.profile?.email as string | undefined) : undefined;
  if (!email) {
    cache.set(cacheKey, null);
    stats.authors_unresolved_no_email++;
    return null;
  }
  const { data: byEmail } = await admin
    .from('team_members')
    .select('id, teams!inner(id, leader_user_id, workspace_id)')
    .ilike('email', email)
    .eq('teams.workspace_id', workspaceId)
    .maybeSingle();
  if (!byEmail || !(byEmail as any).teams?.leader_user_id) {
    cache.set(cacheKey, null);
    stats.authors_unresolved_email_not_in_team++;
    return null;
  }
  await admin.from('team_members').update({ slack_user_id: slackUserId }).eq('id', byEmail.id);
  const resolved: ResolvedAuthor = {
    member_id: byEmail.id as string,
    manager_id: (byEmail as any).teams.leader_user_id,
    workspace_id: workspaceId,
  };
  cache.set(cacheKey, resolved);
  stats.authors_resolved_email_match++;
  return resolved;
}

async function processWorkspace(
  admin: SupabaseClient,
  apiKey: string,
  slackToken: string,
  workspaceId: string,
  settings: any,
): Promise<WorkspaceStats> {
  const stats = emptyStats();

  const lastRun = settings?.last_classifier_run_at
    ? new Date(settings.last_classifier_run_at).getTime() / 1000
    : (Date.now() - 24 * 3600 * 1000) / 1000;

  console.log(JSON.stringify({
    tag: 'workspace_start',
    workspace_id: workspaceId,
    oldest_iso: new Date(lastRun * 1000).toISOString(),
    autojoin: settings?.autojoin_public_channels !== false,
  }));

  const channels = await listAllChannels(slackToken);
  stats.channels_total = channels.length;
  const excluded = new Set<string>(settings?.excluded_channel_ids ?? []);
  const authorCache = new Map<string, ResolvedAuthor | null>();

  for (const ch of channels) {
    if (excluded.has(ch.id)) { stats.channels_excluded++; continue; }
    if (ch.is_member) stats.channels_already_member++;

    if (
      ch.is_channel && !ch.is_private && !ch.is_member &&
      settings?.autojoin_public_channels !== false
    ) {
      const join = await slackCall(slackToken, 'conversations.join', { channel: ch.id });
      if (!join.ok) {
        stats.channels_autojoin_failed++;
        console.log(JSON.stringify({ tag: 'join_fail', channel: ch.name, error: join.error }));
        continue;
      }
      stats.channels_autojoin_ok++;
    }

    if (!ch.is_member && ch.is_private) { stats.channels_skipped_private++; continue; }

    const rootMessages = await fetchHistory(slackToken, ch.id, lastRun);
    if (rootMessages.length === 0) continue;
    stats.channels_with_messages++;
    stats.messages_fetched += rootMessages.length;

    // 1) Puxa réplicas de threads ativas (cap por canal)
    const threadRoots = rootMessages
      .filter((m) => (m.reply_count ?? 0) > 0 && m.thread_ts)
      .slice(0, MAX_THREADS_PER_CHANNEL);

    const replyMessages: any[] = [];
    for (const root of threadRoots) {
      const replies = await fetchReplies(slackToken, ch.id, root.thread_ts ?? root.ts);
      stats.threads_fetched++;
      stats.thread_replies_added += replies.length;
      replyMessages.push(...replies);
    }

    const allMessages = [...rootMessages, ...replyMessages];

    // ── Indexa threads por thread_ts (para construir contexto e participantes) ──
    type ThreadIndex = {
      messages: any[]; // ordenado por ts asc
      participants: Map<string, { slack_user_id: string; name?: string; member?: ResolvedAuthor | null }>;
    };
    const threadIndex = new Map<string, ThreadIndex>();
    const getThreadKey = (m: any): string => m.thread_ts ?? m.ts;
    for (const m of allMessages) {
      const key = getThreadKey(m);
      if (!threadIndex.has(key)) threadIndex.set(key, { messages: [], participants: new Map() });
      threadIndex.get(key)!.messages.push(m);
    }
    for (const t of threadIndex.values()) {
      t.messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
    }

    // 2) Filtragem + resolução de autor
    const candidates: Array<{ msg: any; author: ResolvedAuthor; threadKey: string }> = [];
    const reactionRich: Array<{ msg: any; author: ResolvedAuthor }> = [];
    for (const msg of allMessages) {
      if (msg.bot_id) { stats.messages_dropped_bot++; continue; }
      if (isDroppedSubtype(msg.subtype)) { stats.messages_dropped_subtype++; continue; }
      if (!msg.user) { stats.messages_dropped_no_user++; continue; }

      const author = await resolveAuthorInstr(admin, slackToken, workspaceId, msg.user, authorCache, stats);
      if (!author) { stats.messages_dropped_unresolved_author++; continue; }

      // registra participante na thread
      const tk = getThreadKey(msg);
      const tIdx = threadIndex.get(tk);
      if (tIdx && !tIdx.participants.has(msg.user)) {
        tIdx.participants.set(msg.user, { slack_user_id: msg.user, member: author });
      }

      // Caminho A: mensagem com texto → LLM
      if (!isNoise(msg.text, !!msg.bot_id)) {
        candidates.push({ msg, author, threadKey: tk });
      } else {
        stats.messages_dropped_noise++;
      }

      // Caminho B: mensagem com reações fortes → evidência sintética
      const reactionCount = Array.isArray(msg.reactions)
        ? msg.reactions.reduce((acc: number, r: any) => acc + (r.count ?? 0), 0)
        : 0;
      if (reactionCount >= REACTION_MIN_COUNT) {
        reactionRich.push({ msg, author });
      }
    }

    // 3) Evidências sintéticas de reação (sem LLM)
    for (const { msg, author } of reactionRich) {
      const reactions = msg.reactions as Array<{ name: string; count: number; users: string[] }>;
      const totalCount = reactions.reduce((acc, r) => acc + (r.count ?? 0), 0);
      const uniqueUsers = new Set<string>();
      for (const r of reactions) for (const u of r.users ?? []) uniqueUsers.add(u);
      const emojiList = reactions
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
        .slice(0, 4)
        .map((r) => `:${r.name}:`)
        .join(' ');
      const score = Math.min(0.6 + 0.1 * totalCount, 0.95);
      const summary = `Post recebeu ${totalCount} reações (${emojiList}) de ${uniqueUsers.size} colega${uniqueUsers.size === 1 ? '' : 's'}.`;

      const permalinkRes = await slackCall(slackToken, 'chat.getPermalink', {
        channel: ch.id, message_ts: msg.ts,
      });
      const permalink = permalinkRes.ok ? permalinkRes.permalink : null;

      const { error: rxErr } = await admin
        .from('slack_ambient_evidence')
        .insert({
          workspace_id: author.workspace_id,
          manager_id: author.manager_id,
          member_id: author.member_id,
          slack_channel_id: ch.id,
          slack_channel_name: ch.name,
          slack_message_ts: msg.ts,
          message_text: msg.text ?? '',
          permalink,
          category: 'reconhecimento',
          relevance_score: score,
          summary,
          executive_summary: `${uniqueUsers.size} colega(s) reagiram ao post (${emojiList}). Sinal de reconhecimento social do time.`,
          key_quote: (msg.text ?? '').slice(0, 180),
          thread_root_ts: msg.thread_ts ?? msg.ts,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          attribution: 'reaction',
          captured_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        });
      if (rxErr) {
        if (rxErr.message?.includes('duplicate key')) stats.duplicates++;
        else { console.error('[insert reaction]', rxErr.message); stats.errors++; }
      } else {
        stats.saved++;
        stats.reaction_evidence_added++;
      }
    }

    if (candidates.length === 0) continue;
    stats.candidates += candidates.length;

    // helper: serializa contexto da thread (até 8 msgs ao redor)
    const buildThreadContext = (threadKey: string, targetTs: string): string => {
      const t = threadIndex.get(threadKey);
      if (!t || t.messages.length <= 1) return '';
      const msgs = t.messages.slice(0, 10);
      return msgs
        .map((m) => {
          const author = m.user
            ? (authorCache.get(`${workspaceId}:${m.user}`)?.member_id ?? m.user)
            : 'sistema';
          const marker = m.ts === targetTs ? '👉 ' : '';
          const txt = (m.text ?? '').replace(/\s+/g, ' ').slice(0, 280);
          return `${marker}[${author}] ${txt}`;
        })
        .join('\n');
    };

    // 4) Classificação LLM em batch
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const slice = candidates.slice(i, i + BATCH_SIZE);
      const inputs: ClassificationInput[] = slice.map((c, idx) => ({
        idx,
        text: c.msg.text,
        channel_name: ch.name,
        thread_context: buildThreadContext(c.threadKey, c.msg.ts),
      }));
      stats.llm_calls++;
      const results = await classifyBatch(apiKey, inputs);
      stats.llm_returned += results.length;

      for (const r of results) {
        if (r.relevance_score < RELEVANCE_THRESHOLD) continue;
        stats.llm_above_threshold++;
        const target = slice[r.idx];
        if (!target) continue;

        const permalinkRes = await slackCall(slackToken, 'chat.getPermalink', {
          channel: ch.id, message_ts: target.msg.ts,
        });
        const permalink = permalinkRes.ok ? permalinkRes.permalink : null;

        // participantes resolvidos da thread (até 6)
        const tIdx = threadIndex.get(target.threadKey);
        const participantsArr = tIdx
          ? Array.from(tIdx.participants.values())
              .filter((p) => p.member?.member_id)
              .slice(0, 6)
              .map((p) => ({
                member_id: p.member!.member_id,
                slack_user_id: p.slack_user_id,
              }))
          : [];

        const basePayload = {
          workspace_id: target.author.workspace_id,
          manager_id: target.author.manager_id,
          slack_channel_id: ch.id,
          slack_channel_name: ch.name,
          slack_message_ts: target.msg.ts,
          thread_root_ts: target.msg.thread_ts ?? target.msg.ts,
          message_text: target.msg.text,
          permalink,
          category: r.category ?? 'outro',
          relevance_score: r.relevance_score,
          summary: r.summary,
          executive_summary: r.executive_summary ?? r.summary,
          key_quote: r.key_quote ?? (target.msg.text ?? '').slice(0, 180),
          thread_topic: r.thread_topic ?? null,
          theme_tags: Array.isArray(r.theme_tags) ? r.theme_tags.slice(0, 5) : [],
          participants: participantsArr,
          // Auto-aprovado quando alta confiança e categoria útil; senão fica pendente p/ triagem
          status: (r.relevance_score >= 0.7 && (r.category ?? 'outro') !== 'outro') ? 'approved' : 'pending',
          reviewed_at: (r.relevance_score >= 0.7 && (r.category ?? 'outro') !== 'outro') ? new Date().toISOString() : null,
          captured_at: new Date(parseFloat(target.msg.ts) * 1000).toISOString(),
        };

        // 4a) Evidência principal: autor
        const { error: insertErr } = await admin
          .from('slack_ambient_evidence')
          .insert({ ...basePayload, member_id: target.author.member_id, attribution: 'author' });

        if (insertErr) {
          if (insertErr.message?.includes('duplicate key')) stats.duplicates++;
          else { console.error('[insert]', insertErr.message); stats.errors++; }
        } else {
          stats.saved++;
        }

        // 4b) Evidências secundárias: menções (só para reconhecimento/conflito)
        if (r.category === 'reconhecimento' || r.category === 'conflito') {
          const mentioned = extractMentions(target.msg.text);
          for (const slackUserId of mentioned) {
            if (slackUserId === target.msg.user) continue; // ignora self-mention
            const mentionedAuthor = await resolveAuthorInstr(
              admin, slackToken, workspaceId, slackUserId, authorCache, stats,
            );
            if (!mentionedAuthor) continue;
            if (mentionedAuthor.member_id === target.author.member_id) continue;

            const { error: mErr } = await admin
              .from('slack_ambient_evidence')
              .insert({
                ...basePayload,
                manager_id: mentionedAuthor.manager_id,
                member_id: mentionedAuthor.member_id,
                attribution: 'mentioned',
              });
            if (mErr) {
              if (mErr.message?.includes('duplicate key')) stats.duplicates++;
              else { console.error('[insert mention]', mErr.message); stats.errors++; }
            } else {
              stats.saved++;
              stats.mention_evidence_added++;
            }
          }
        }
      }
    }
  }

  await admin
    .from('workspace_slack_settings')
    .update({ last_classifier_run_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId);

  console.log(JSON.stringify({ tag: 'workspace_done', workspace_id: workspaceId, ...stats }));
  return stats;
}

// ── Entry point ───────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!slackToken) {
    return new Response(JSON.stringify({ error: 'SLACK_BOT_TOKEN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'slack-ambient-classifier');

  let totalProcessed = 0;
  let totalSaved = 0;
  let totalErrors = 0;
  const workspaceResults: any[] = [];

  try {
    const { data: settingsList, error: settingsErr } = await admin
      .from('workspace_slack_settings')
      .select('workspace_id, ambient_mode_enabled, autojoin_public_channels, excluded_channel_ids, last_classifier_run_at')
      .eq('ambient_mode_enabled', true);

    if (settingsErr) throw settingsErr;
    if (!settingsList || settingsList.length === 0) {
      await run.finish('success', 0);
      return new Response(
        JSON.stringify({ ok: true, message: 'No workspaces with ambient mode enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    for (const settings of settingsList) {
      try {
        const result = await processWorkspace(
          admin,
          apiKey,
          slackToken,
          settings.workspace_id,
          settings,
        );
        totalProcessed += result.messages_fetched;
        totalSaved += result.saved;
        totalErrors += result.errors;
        workspaceResults.push({ workspace_id: settings.workspace_id, ...result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[workspace ${settings.workspace_id}]`, msg);
        totalErrors++;
        workspaceResults.push({ workspace_id: settings.workspace_id, error: msg });
      }
    }

    const status = totalErrors === 0 ? 'success' : totalSaved > 0 ? 'partial' : 'error';
    await run.finish(status, totalSaved);

    return new Response(
      JSON.stringify({
        ok: true,
        workspaces: workspaceResults.length,
        messages_fetched: totalProcessed,
        evidences_saved: totalSaved,
        errors: totalErrors,
        details: workspaceResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await run.finish('error', totalSaved, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
