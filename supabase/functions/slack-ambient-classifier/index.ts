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
  if (trimmed.length < 20) return true;
  if (trimmed.length > 2000) return true; // long copy-paste, low signal
  for (const re of NOISE_PATTERNS) if (re.test(trimmed)) return true;
  return false;
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
}

interface ClassificationResult {
  idx: number;
  relevance_score: number;
  category: 'entrega' | 'bloqueio' | 'reconhecimento' | 'conflito' | 'outro';
  summary: string;
}

async function classifyBatch(
  apiKey: string,
  inputs: ClassificationInput[],
): Promise<ClassificationResult[]> {
  const prompt = `Você analisa mensagens de Slack para extrair evidências sobre desempenho profissional. Para cada mensagem, retorne JSON com:
- idx: índice original
- relevance_score: 0.0 a 1.0 (0 = irrelevante, 1 = evidência clara para review)
- category: "entrega" (concluiu algo), "bloqueio" (impedimento), "reconhecimento" (elogio dado/recebido), "conflito" (atrito interpessoal), "outro"
- summary: 1 frase neutra em português, terceira pessoa, fato concreto.

Critérios para alta relevância (score >= 0.6):
- Menciona entrega/conclusão concreta de trabalho
- Menciona bloqueio explícito ou pedido de ajuda técnica
- Reconhecimento explícito ("ótimo trabalho", "obrigado por...")
- Sinal claro de conflito ou tensão

BAIXA relevância (score < 0.6):
- Small talk, memes, GIFs
- Mensagens vagas ou status genérico
- Apenas links sem contexto

Retorne APENAS um array JSON válido, sem texto extra.

Mensagens:
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
async function processWorkspace(
  admin: SupabaseClient,
  apiKey: string,
  slackToken: string,
  workspaceId: string,
  settings: any,
): Promise<{ processed: number; saved: number; errors: number }> {
  let processed = 0;
  let saved = 0;
  let errors = 0;

  // Determine oldest timestamp (since last run, fallback 24h)
  const lastRun = settings?.last_classifier_run_at
    ? new Date(settings.last_classifier_run_at).getTime() / 1000
    : (Date.now() - 24 * 3600 * 1000) / 1000;

  const channels = await listAllChannels(slackToken);
  const excluded = new Set<string>(settings?.excluded_channel_ids ?? []);
  const authorCache = new Map<string, ResolvedAuthor | null>();

  for (const ch of channels) {
    if (excluded.has(ch.id)) continue;

    // Autojoin public channels we're not in
    if (
      ch.is_channel &&
      !ch.is_private &&
      !ch.is_member &&
      settings?.autojoin_public_channels !== false
    ) {
      const join = await slackCall(slackToken, 'conversations.join', { channel: ch.id });
      if (!join.ok) {
        console.log(`[join] ${ch.name} failed: ${join.error}`);
        continue;
      }
    }

    if (!ch.is_member && ch.is_private) continue; // skip private without invite

    const messages = await fetchHistory(slackToken, ch.id, lastRun);
    if (messages.length === 0) continue;

    // Build candidates
    const candidates: Array<{ msg: any; author: ResolvedAuthor }> = [];
    for (const msg of messages) {
      processed++;
      if (msg.subtype || msg.bot_id) continue;
      if (isNoise(msg.text, !!msg.bot_id)) continue;
      if (!msg.user) continue;

      const author = await resolveAuthor(admin, slackToken, workspaceId, msg.user, authorCache);
      if (!author) continue;

      candidates.push({ msg, author });
    }

    if (candidates.length === 0) continue;

    // Classify in batches
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const slice = candidates.slice(i, i + BATCH_SIZE);
      const inputs: ClassificationInput[] = slice.map((c, idx) => ({
        idx,
        text: c.msg.text,
        channel_name: ch.name,
      }));

      const results = await classifyBatch(apiKey, inputs);

      for (const r of results) {
        if (r.relevance_score < RELEVANCE_THRESHOLD) continue;
        const target = slice[r.idx];
        if (!target) continue;

        // Build permalink
        const permalinkRes = await slackCall(slackToken, 'chat.getPermalink', {
          channel: ch.id,
          message_ts: target.msg.ts,
        });
        const permalink = permalinkRes.ok ? permalinkRes.permalink : null;

        const { error: insertErr } = await admin
          .from('slack_ambient_evidence')
          .insert({
            workspace_id: target.author.workspace_id,
            manager_id: target.author.manager_id,
            member_id: target.author.member_id,
            slack_channel_id: ch.id,
            slack_channel_name: ch.name,
            slack_message_ts: target.msg.ts,
            message_text: target.msg.text,
            permalink,
            category: r.category ?? 'outro',
            relevance_score: r.relevance_score,
            summary: r.summary,
            status: 'pending',
            captured_at: new Date(parseFloat(target.msg.ts) * 1000).toISOString(),
          });

        if (insertErr) {
          // 23505 = unique violation (already captured) — silently skip
          if (!insertErr.message?.includes('duplicate key')) {
            console.error('[insert]', insertErr.message);
            errors++;
          }
        } else {
          saved++;
        }
      }
    }
  }

  // Update last_classifier_run_at
  await admin
    .from('workspace_slack_settings')
    .update({ last_classifier_run_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId);

  return { processed, saved, errors };
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
        totalProcessed += result.processed;
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
        messages_processed: totalProcessed,
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
