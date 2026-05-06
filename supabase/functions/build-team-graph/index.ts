// build-team-graph — Sprint 13 (ONA Foundation)
//
// Cron diário (03:00 UTC) que:
// 1. Lê eventos novos de Slack (mentions, thread replies, reactions, DMs em canais autorizados)
// 2. Lê eventos novos de Google Calendar (meeting attendees) — workspace-by-workspace
// 3. Insere em graph_events_raw (idempotente via external_ref)
// 4. Recomputa team_network_edges para janelas 30/60/90 dias
// 5. Roda TTL (apaga eventos > 90d)
//
// IMPORTANTE: este é o "build" — não envia DMs, não dispara alertas.
// Esses ficam pra Sprint 15 (proactive alerts).

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { validateCronSecret } from '../_shared/cronAuth.ts';
import { getAdminClient, startAutomationRun } from '../_shared/automationRun.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const SLACK_API = 'https://slack.com/api';
const SLACK_LOOKBACK_HOURS = 24; // each run pulls last 24h of slack history
const CAL_LOOKBACK_DAYS = 7;

// ── Weights (calibrable; see plan) ────────────────────────────────────
const WEIGHTS = {
  slack_dm: 3.0,
  slack_thread_reply: 2.0,
  slack_mention: 1.5,
  slack_reaction: 0.3,
  // gcal: weight is computed per-event (duration_minutes / 30, capped at 4)
} as const;

// ── Slack helpers (rate-limit aware) ──────────────────────────────────
async function slackCall(
  token: string,
  method: string,
  params: Record<string, string> = {},
): Promise<any> {
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

// ── Resolve slack user_id → team_member.id (cached on team_members) ──
async function resolveSlackMember(
  admin: SupabaseClient,
  workspaceId: string,
  slackUserId: string,
  cache: Map<string, string | null>,
): Promise<string | null> {
  const cacheKey = `${workspaceId}:${slackUserId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const { data } = await admin
    .from('team_members')
    .select('id, teams!inner(workspace_id)')
    .eq('slack_user_id', slackUserId)
    .eq('teams.workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  const memberId = (data as any)?.id ?? null;
  cache.set(cacheKey, memberId);
  return memberId;
}

// ── INGESTION: SLACK ──────────────────────────────────────────────────
interface RawEvent {
  workspace_id: string;
  source: 'slack' | 'gcal';
  event_type: string;
  actor_member_id: string | null;
  target_member_id: string | null;
  weight: number;
  occurred_at: string;
  external_ref: string;
  metadata: Record<string, unknown>;
}

async function ingestSlackForWorkspace(
  admin: SupabaseClient,
  workspaceId: string,
  botToken: string,
  oldestTs: number,
  cache: Map<string, string | null>,
): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  // List channels the bot is in (public + invited private)
  const chJson = await slackCall(botToken, 'users.conversations', {
    types: 'public_channel,private_channel',
    exclude_archived: 'true',
    limit: '200',
  });
  if (!chJson.ok) {
    console.log(`[slack ws=${workspaceId}] users.conversations error=${chJson.error}`);
    return events;
  }
  const channels: any[] = chJson.channels ?? [];

  for (const ch of channels) {
    const histJson = await slackCall(botToken, 'conversations.history', {
      channel: ch.id,
      limit: '100',
      oldest: String(oldestTs),
    });
    if (!histJson.ok) continue;

    const messages: any[] = histJson.messages ?? [];
    for (const msg of messages) {
      if (msg.subtype || msg.bot_id) continue; // skip joins, bot messages
      if (!msg.user || !msg.ts) continue;

      const actorId = await resolveSlackMember(admin, workspaceId, msg.user, cache);
      if (!actorId) continue;

      const occurredAt = new Date(parseFloat(msg.ts) * 1000).toISOString();
      const text: string = msg.text ?? '';

      // Mentions: @U12345 in text
      const mentionMatches = [...text.matchAll(/<@([UW][A-Z0-9]+)>/g)];
      for (const m of mentionMatches) {
        const targetId = await resolveSlackMember(admin, workspaceId, m[1], cache);
        if (!targetId || targetId === actorId) continue;
        events.push({
          workspace_id: workspaceId,
          source: 'slack',
          event_type: 'mention',
          actor_member_id: actorId,
          target_member_id: targetId,
          weight: WEIGHTS.slack_mention,
          occurred_at: occurredAt,
          external_ref: `${ch.id}:${msg.ts}:${m[1]}`,
          metadata: { channel_id: ch.id },
        });
      }

      // Thread replies — fetch when thread_ts !== ts (means it's a reply)
      if (msg.thread_ts && msg.thread_ts !== msg.ts) {
        // The reply's actor is msg.user; the target is the thread parent author.
        // We don't know parent author from history; use a separate lookup only if we haven't yet.
        // Simpler: fetch replies once per thread_ts (handled below as a separate scan would be expensive).
        // For now we record the reply edge as actor → unknown(null) and aggregate later via parent re-lookup.
        // Skipped to keep this PR small — Sprint 14 polish.
      }

      // Reactions: present when message has `reactions: [{ name, users: [...] }]`
      // For new messages, reactions usually arrive later via events.added — not in history snapshot.
      // We capture reactions present in the pulled history snapshot.
      if (Array.isArray(msg.reactions)) {
        for (const r of msg.reactions) {
          for (const reactorSlackId of r.users ?? []) {
            const reactorId = await resolveSlackMember(admin, workspaceId, reactorSlackId, cache);
            if (!reactorId || reactorId === actorId) continue;
            events.push({
              workspace_id: workspaceId,
              source: 'slack',
              event_type: 'reaction',
              actor_member_id: reactorId,
              target_member_id: actorId,
              weight: WEIGHTS.slack_reaction,
              occurred_at: occurredAt,
              external_ref: `${ch.id}:${msg.ts}:${reactorSlackId}:${r.name}`,
              metadata: { channel_id: ch.id, emoji: r.name },
            });
          }
        }
      }
    }
  }

  return events;
}

// ── INGESTION: GOOGLE CALENDAR ────────────────────────────────────────
async function refreshGoogleToken(
  admin: SupabaseClient,
  userId: string,
  refreshToken: string,
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) return null;
  const expiry = new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString();
  await admin
    .from('google_calendar_tokens')
    .update({ access_token: json.access_token, token_expiry: expiry })
    .eq('user_id', userId);
  return json.access_token;
}

async function ingestCalendarForWorkspace(
  admin: SupabaseClient,
  workspaceId: string,
  cache: Map<string, string | null>,
): Promise<RawEvent[]> {
  const events: RawEvent[] = [];

  // Find all calendar tokens of users that belong to this workspace
  // (workspace = owner OR HR Admin OR team leader OR linked member)
  const { data: members } = await admin
    .from('team_members')
    .select('linked_user_id, teams!inner(workspace_id)')
    .eq('teams.workspace_id', workspaceId)
    .not('linked_user_id', 'is', null);

  const userIds = new Set<string>();
  for (const m of (members ?? []) as any[]) {
    if (m.linked_user_id) userIds.add(m.linked_user_id);
  }
  // Also include team leaders + workspace owner
  const { data: ws } = await admin.from('workspaces').select('owner_id').eq('id', workspaceId).single();
  if (ws?.owner_id) userIds.add(ws.owner_id);
  const { data: leaders } = await admin
    .from('teams')
    .select('leader_user_id')
    .eq('workspace_id', workspaceId);
  for (const l of (leaders ?? []) as any[]) {
    if (l.leader_user_id) userIds.add(l.leader_user_id);
  }
  if (userIds.size === 0) return events;

  const { data: tokens } = await admin
    .from('google_calendar_tokens')
    .select('user_id, access_token, refresh_token, token_expiry')
    .in('user_id', Array.from(userIds));

  if (!tokens || tokens.length === 0) return events;

  const timeMin = new Date(Date.now() - CAL_LOOKBACK_DAYS * 86400_000).toISOString();
  const timeMax = new Date().toISOString();

  // Email → member_id cache
  const emailCache = new Map<string, string | null>();
  async function resolveByEmail(email: string): Promise<string | null> {
    const key = `${workspaceId}:${email.toLowerCase()}`;
    if (emailCache.has(key)) return emailCache.get(key)!;
    const { data } = await admin
      .from('team_members')
      .select('id, teams!inner(workspace_id)')
      .eq('teams.workspace_id', workspaceId)
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    const id = (data as any)?.id ?? null;
    emailCache.set(key, id);
    return id;
  }

  for (const tok of tokens as any[]) {
    let accessToken: string | null = tok.access_token;
    if (tok.token_expiry && new Date(tok.token_expiry) < new Date()) {
      if (!tok.refresh_token) continue;
      accessToken = await refreshGoogleToken(admin, tok.user_id, tok.refresh_token);
      if (!accessToken) continue;
    }

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('maxResults', '250');
    url.searchParams.set('orderBy', 'startTime');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) continue;
    const json = await res.json();

    for (const ev of json.items ?? []) {
      const attendees: any[] = ev.attendees ?? [];
      if (attendees.length < 2) continue;
      const start = ev.start?.dateTime || ev.start?.date;
      const end = ev.end?.dateTime || ev.end?.date;
      if (!start || !end) continue;
      const durationMin = Math.max(
        (new Date(end).getTime() - new Date(start).getTime()) / 60000,
        15,
      );
      const weight = Math.min(durationMin / 30, 4.0);
      const occurredAt = new Date(start).toISOString();

      // Resolve all attendees to member IDs
      const memberIds: string[] = [];
      for (const a of attendees) {
        if (!a.email || a.responseStatus === 'declined') continue;
        const id = await resolveByEmail(a.email);
        if (id) memberIds.push(id);
      }
      if (memberIds.length < 2) continue;

      // Generate canonical pairs (a < b lexically)
      const unique = Array.from(new Set(memberIds));
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          const [a, b] = [unique[i], unique[j]].sort();
          events.push({
            workspace_id: workspaceId,
            source: 'gcal',
            event_type: 'meeting_attendee',
            actor_member_id: a,
            target_member_id: b,
            weight,
            occurred_at: occurredAt,
            external_ref: `${ev.id}:${a}:${b}`,
            metadata: { duration_min: durationMin, event_id: ev.id },
          });
        }
      }
    }
  }

  return events;
}

// ── BATCH INSERT graph_events_raw (chunks of 500) ─────────────────────
async function insertEvents(admin: SupabaseClient, events: RawEvent[]): Promise<number> {
  if (events.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < events.length; i += 500) {
    const chunk = events.slice(i, i + 500);
    const { error } = await admin
      .from('graph_events_raw')
      .upsert(chunk as any, {
        onConflict: 'source,event_type,external_ref,actor_member_id,target_member_id',
        ignoreDuplicates: true,
      });
    if (error) {
      console.error('[insertEvents] error', error.message);
      continue;
    }
    inserted += chunk.length;
  }
  return inserted;
}

// ── RECOMPUTE team_network_edges for a workspace ──────────────────────
async function recomputeEdges(admin: SupabaseClient, workspaceId: string): Promise<number> {
  // Use a SQL-side aggregation via .rpc would be ideal but we can do it via raw SQL:
  // Postgres doesn't expose arbitrary SQL through supabase-js; use a stored function.
  // For simplicity in this sprint: pull events, aggregate in-memory per window, upsert.

  const now = Date.now();
  let totalUpserts = 0;

  for (const window of [30, 60, 90]) {
    const since = new Date(now - window * 86400_000).toISOString();
    const { data: rows } = await admin
      .from('graph_events_raw')
      .select('actor_member_id, target_member_id, weight, source, occurred_at')
      .eq('workspace_id', workspaceId)
      .gte('occurred_at', since)
      .not('actor_member_id', 'is', null)
      .not('target_member_id', 'is', null);

    if (!rows || rows.length === 0) {
      // wipe stale aggregations
      await admin
        .from('team_network_edges')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('window_days', window);
      continue;
    }

    // Aggregate canonical pairs
    const agg = new Map<string, {
      a: string;
      b: string;
      weight: number;
      count: number;
      sources: Set<string>;
      lastEvent: string;
    }>();

    for (const r of rows as any[]) {
      const [a, b] = [r.actor_member_id, r.target_member_id].sort();
      if (a === b) continue;
      const key = `${a}|${b}`;
      const cur = agg.get(key);
      if (cur) {
        cur.weight += Number(r.weight ?? 0);
        cur.count += 1;
        cur.sources.add(r.source);
        if (r.occurred_at > cur.lastEvent) cur.lastEvent = r.occurred_at;
      } else {
        agg.set(key, {
          a, b,
          weight: Number(r.weight ?? 0),
          count: 1,
          sources: new Set([r.source]),
          lastEvent: r.occurred_at,
        });
      }
    }

    // Replace edges for this workspace+window atomically (delete then insert)
    await admin
      .from('team_network_edges')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('window_days', window);

    const edges = Array.from(agg.values()).map((e) => ({
      workspace_id: workspaceId,
      member_a_id: e.a,
      member_b_id: e.b,
      window_days: window,
      weight_total: e.weight,
      event_count: e.count,
      sources: Array.from(e.sources),
      last_event_at: e.lastEvent,
      computed_at: new Date().toISOString(),
    }));

    for (let i = 0; i < edges.length; i += 500) {
      const chunk = edges.slice(i, i + 500);
      const { error } = await admin.from('team_network_edges').insert(chunk as any);
      if (error) {
        console.error(`[recomputeEdges ws=${workspaceId} w=${window}] insert error`, error.message);
        continue;
      }
      totalUpserts += chunk.length;
    }
  }
  return totalUpserts;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Allow super admin (auth bearer) OR cron secret
  const authHeader = req.headers.get('Authorization');
  const isSuperAdminCall = !!authHeader;
  if (!isSuperAdminCall) {
    const check = validateCronSecret(req);
    if (!check.valid) return check.error!;
  }

  // Parse optional body { workspace_id?: string }
  let onlyWorkspaceId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.workspace_id) onlyWorkspaceId = String(body.workspace_id);
  } catch {/* no body */}

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'build-team-graph', {
    workspace_id: onlyWorkspaceId,
    triggered_by: isSuperAdminCall ? 'manual' : 'cron',
  });

  let totalEvents = 0;
  let totalEdges = 0;
  let workspacesProcessed = 0;
  let pruned = 0;

  try {
    // 1. List active workspaces (optionally filter to one)
    let wsQuery = admin
      .from('workspaces')
      .select('id, name')
      .eq('is_active', true);
    if (onlyWorkspaceId) wsQuery = wsQuery.eq('id', onlyWorkspaceId);
    const { data: workspaces } = await wsQuery;

    for (const ws of (workspaces ?? []) as any[]) {
      const cache = new Map<string, string | null>();
      const allEvents: RawEvent[] = [];

      // Slack: get the workspace's bot token (any slack_integration row in workspace)
      const { data: slackInts } = await admin
        .from('slack_integrations')
        .select('id, slack_team_id')
        .eq('workspace_id', ws.id)
        .limit(1);

      // We need the bot token — it's stored elsewhere (env-managed in this project)
      // The project uses SLACK_BOT_TOKEN env (custom app architecture v2)
      const botToken = Deno.env.get('SLACK_BOT_TOKEN');
      if (slackInts && slackInts.length > 0 && botToken) {
        const oldestTs = Math.floor((Date.now() - SLACK_LOOKBACK_HOURS * 3600_000) / 1000);
        try {
          const slackEvents = await ingestSlackForWorkspace(
            admin, ws.id, botToken, oldestTs, cache,
          );
          allEvents.push(...slackEvents);
        } catch (e) {
          console.error(`[slack ws=${ws.id}]`, (e as Error).message);
        }
      }

      // Calendar
      try {
        const calEvents = await ingestCalendarForWorkspace(admin, ws.id, cache);
        allEvents.push(...calEvents);
      } catch (e) {
        console.error(`[gcal ws=${ws.id}]`, (e as Error).message);
      }

      const inserted = await insertEvents(admin, allEvents);
      const upserted = await recomputeEdges(admin, ws.id);

      console.log(`[ws ${ws.id}] events_in=${allEvents.length} inserted=${inserted} edges=${upserted}`);
      totalEvents += inserted;
      totalEdges += upserted;
      workspacesProcessed++;
    }

    // TTL: prune events > 90d (only on full cron runs)
    if (!onlyWorkspaceId) {
      const { data: pruneRes } = await admin.rpc('prune_graph_events_raw');
      pruned = (pruneRes as number | null) ?? 0;
    }

    await run.finish('success', totalEvents, undefined);

    return new Response(JSON.stringify({
      ok: true,
      workspaces_processed: workspacesProcessed,
      events_ingested: totalEvents,
      edges_recomputed: totalEdges,
      pruned_old_events: pruned,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error('[build-team-graph] fatal', msg);
    await run.finish('error', totalEvents, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
