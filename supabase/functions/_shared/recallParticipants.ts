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

/** Fetches participants from BOTH legacy field AND participant_events.
 *  Returns a deduplicated list. Never throws — returns [] on any error. */
export async function fetchAllRecallParticipants(
  botId: string,
  recallApiKey: string,
): Promise<RecallParticipant[]> {
  const headers = { Authorization: `Token ${recallApiKey}` };
  const out = new Map<string, RecallParticipant>();

  let botData: any = null;
  try {
    const resp = await fetch(`${RECALL_BASE}/bot/${botId}/`, { headers });
    if (resp.ok) botData = await resp.json();
  } catch (e) {
    console.error(`[recallParticipants] bot/${botId} fetch failed:`, e);
    return [];
  }
  if (!botData) return [];

  // Legacy source
  const legacy: RecallParticipant[] = botData.meeting_participants ?? [];
  for (const p of legacy) {
    const key = normalizeName(p.name) || `email:${(p.email ?? "").toLowerCase()}` || `id:${p.id}`;
    if (key && !out.has(key)) out.set(key, p);
  }

  // Authoritative source: participant_events download URL
  try {
    const recordings = botData.recordings ?? [];
    for (const rec of recordings) {
      const url = rec?.media_shortcuts?.participant_events?.data?.participants_download_url;
      if (!url) continue;
      const peResp = await fetch(url);
      if (!peResp.ok) continue;
      const list = await peResp.json();
      if (!Array.isArray(list)) continue;
      for (const p of list as RecallParticipant[]) {
        const key = normalizeName(p.name) || `email:${(p.email ?? "").toLowerCase()}` || `id:${p.id}`;
        if (key && !out.has(key)) out.set(key, p);
      }
    }
  } catch (e) {
    console.error(`[recallParticipants] participant_events fetch failed for ${botId}:`, e);
  }

  const merged = Array.from(out.values());
  if (legacy.length === 0 && merged.length > 0) {
    console.warn(
      `[recallParticipants] bot ${botId}: legacy meeting_participants was EMPTY but participant_events returned ${merged.length} participant(s). This is the reason previous bots were incorrectly marked skipped_no_leader.`,
    );
  }
  return merged;
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
