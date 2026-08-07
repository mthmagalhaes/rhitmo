// Shared helpers to robustly resolve participants of a Recall.ai bot recording.
//
// Why this exists:
// The legacy `bot.meeting_participants` field on the v1 bot retrieve endpoint is
// frequently EMPTY for Google Meet recordings (the field only populates reliably
// when participants joined via Calendar invite with an exposed email).
// The authoritative source is `recordings[*].media_shortcuts.participant_events`
// which exposes a JSON download URL with the full list of unique participants
// (id, name, is_host, platform). Emails are usually null on Google Meet.
//
// We must therefore match leaders / members by NAME (case- and accent-insensitive),
// with email/email-prefix as a fallback.

export interface RecallParticipant {
  id?: number | string;
  name?: string;
  email?: string | null;
  is_host?: boolean;
}

const RECALL_BASE = "https://us-west-2.recall.ai/api/v1";

/** Strip diacritics, lowercase, collapse whitespace and dots. */
export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParticipantsResult =
  | { status: "ok"; participants: RecallParticipant[]; msSinceRecordingStart: number | null }
  | { status: "inconclusive"; participants: RecallParticipant[]; msSinceRecordingStart: number | null };

/** Fetches participants from BOTH legacy field AND participant_events.
 *  Returns a deduplicated list with a status flag.
 *
 *  - status: "ok" → trust the result (even if empty: leader truly absent).
 *  - status: "inconclusive" → both sources empty AND bot has been recording
 *    for less than 90s. Caller should retry later, NOT mark as no-leader.
 *
 *  Never throws — returns inconclusive with [] on any network error. */
export async function fetchAllRecallParticipantsDetailed(
  botId: string,
  recallApiKey: string,
): Promise<ParticipantsResult> {
  const headers = { Authorization: `Token ${recallApiKey}` };
  const out = new Map<string, RecallParticipant>();

  let botData: any = null;
  try {
    const resp = await fetch(`${RECALL_BASE}/bot/${botId}/`, { headers });
    if (resp.ok) botData = await resp.json();
  } catch (e) {
    console.error(`[recallParticipants] bot/${botId} fetch failed:`, e);
    return { status: "inconclusive", participants: [] };
  }
  if (!botData) return { status: "inconclusive", participants: [] };

  // Legacy source
  const legacy: RecallParticipant[] = botData.meeting_participants ?? [];
  for (const p of legacy) {
    const key = normalizeName(p.name) || `email:${(p.email ?? "").toLowerCase()}` || `id:${p.id}`;
    if (key && !out.has(key)) out.set(key, p);
  }

  // Authoritative source: participant_events download URL
  let eventsCount = 0;
  try {
    const recordings = botData.recordings ?? [];
    for (const rec of recordings) {
      const url = rec?.media_shortcuts?.participant_events?.data?.participants_download_url;
      if (!url) continue;
      const peResp = await fetch(url);
      if (!peResp.ok) continue;
      const list = await peResp.json();
      if (!Array.isArray(list)) continue;
      eventsCount += list.length;
      for (const p of list as RecallParticipant[]) {
        const key = normalizeName(p.name) || `email:${(p.email ?? "").toLowerCase()}` || `id:${p.id}`;
        if (key && !out.has(key)) out.set(key, p);
      }
    }
  } catch (e) {
    console.error(`[recallParticipants] participant_events fetch failed for ${botId}:`, e);
  }

  const merged = Array.from(out.values());

  // Compute time since recording started (for inconclusive heuristic)
  let msSinceRecordingStart: number | null = null;
  try {
    const recordings = botData.recordings ?? [];
    const startedAt = recordings[0]?.started_at;
    if (startedAt) msSinceRecordingStart = Date.now() - new Date(startedAt).getTime();
  } catch { /* noop */ }

  const botStatusCode: string = botData?.status_changes?.slice(-1)?.[0]?.code ?? botData?.status?.code ?? "";
  const isStillRecording = ["recording", "in_call_recording", "in_call_not_recording"].includes(botStatusCode);

  // Inconclusive only when: both sources empty AND bot is mid-call AND recording is fresh (<90s).
  // This prevents the "phantom kill" bug where the resolver returns 0 too early and the cron
  // wrongly marks the bot as skipped_no_leader.
  const inconclusive =
    merged.length === 0 &&
    isStillRecording &&
    msSinceRecordingStart !== null &&
    msSinceRecordingStart < 90_000;

  console.log(JSON.stringify({
    tag: "[recallParticipants]",
    bot_id: botId,
    legacy_count: legacy.length,
    events_count: eventsCount,
    merged_count: merged.length,
    bot_status: botStatusCode,
    ms_since_recording_start: msSinceRecordingStart,
    decision: inconclusive ? "inconclusive" : "ok",
  }));

  if (legacy.length === 0 && merged.length > 0) {
    console.warn(
      `[recallParticipants] bot ${botId}: legacy meeting_participants was EMPTY but participant_events returned ${merged.length} participant(s).`,
    );
  }

  return { status: inconclusive ? "inconclusive" : "ok", participants: merged };
}

/** Backward-compatible wrapper. Prefer fetchAllRecallParticipantsDetailed for new code. */
export async function fetchAllRecallParticipants(
  botId: string,
  recallApiKey: string,
): Promise<RecallParticipant[]> {
  const r = await fetchAllRecallParticipantsDetailed(botId, recallApiKey);
  return r.participants;
}

/** Decide whether the leader is among the participants.
 *  Match strategy (any of):
 *  - exact email match
 *  - exact normalized-name match against any leader display name candidate
 *  - participant name contains any leader candidate (or vice-versa) */
export function isLeaderPresent(
  participants: RecallParticipant[],
  candidates: { email?: string | null; names?: (string | null | undefined)[] },
): boolean {
  const email = (candidates.email ?? "").toLowerCase();
  const emailPrefix = email.split("@")[0] || "";
  const namePool = (candidates.names ?? [])
    .map(normalizeName)
    .filter((n) => n.length > 1);
  // Always also try the email prefix as a name candidate (e.g. "matheus magalhaes")
  if (emailPrefix) namePool.push(normalizeName(emailPrefix));

  for (const p of participants) {
    const pEmail = (p.email ?? "").toLowerCase();
    if (email && pEmail && pEmail === email) return true;
    const pName = normalizeName(p.name);
    if (!pName) continue;
    for (const cand of namePool) {
      if (!cand) continue;
      if (pName === cand) return true;
      // Fuzzy contains in either direction (handles "Matheus" vs "Matheus Magalhaes")
      if (cand.length >= 4 && (pName.includes(cand) || cand.includes(pName))) return true;
    }
  }
  return false;
}

/** Match Recall participants to local team_members by name.
 *  Returns the set of member_ids whose name matched at least one participant. */
export function matchMembersToParticipants(
  participants: RecallParticipant[],
  members: { id: string; name: string | null; email: string | null }[],
): string[] {
  const matched = new Set<string>();
  const normParticipants = participants.map((p) => ({
    name: normalizeName(p.name),
    email: (p.email ?? "").toLowerCase(),
  }));
  for (const m of members) {
    const mn = normalizeName(m.name);
    const me = (m.email ?? "").toLowerCase();
    for (const p of normParticipants) {
      if (me && p.email && me === p.email) {
        matched.add(m.id);
        break;
      }
      if (!mn || !p.name) continue;
      if (mn === p.name) {
        matched.add(m.id);
        break;
      }
      // Fuzzy: first+last name overlap
      if (mn.length >= 4 && p.name.length >= 4 && (mn.includes(p.name) || p.name.includes(mn))) {
        matched.add(m.id);
        break;
      }
    }
  }
  return Array.from(matched);
}
