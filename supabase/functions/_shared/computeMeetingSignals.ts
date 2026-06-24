// Pure helpers para extrair sinais objetivos de um transcript do Recall.ai.
//
// Cada segmento do Recall (`transcriptData[i]`) tem o formato:
//   { participant?: { id, name }, speaker?, speaker_id?, words: [{ text, start_timestamp: { relative }, end_timestamp: { relative } }] }
//
// Calculamos por participante:
//   - talk_seconds / talk_pct
//   - turn_count
//   - words_total / avg_turn_words / words_per_minute
//   - questions_asked  (turnos terminados em ?)
//   - interruptions_made (turno que começa enquanto outro fala)
//   - meeting_seconds (último timestamp menos o primeiro)
//   - silence_seconds (gaps > 3s entre fim de turno e início do próximo)
//
// Tudo é tolerante a payloads parcialmente quebrados — qualquer segmento sem
// timestamps válidos é ignorado naquela métrica.

export interface RecallWord {
  text?: string;
  start_timestamp?: { relative?: number } | number | null;
  end_timestamp?: { relative?: number } | number | null;
}

export interface RecallSegment {
  participant?: { id?: number; name?: string | null } | null;
  speaker?: string | number | null;
  speaker_id?: number | null;
  words?: RecallWord[];
}

export interface ParticipantSignals {
  participant_name: string;
  talk_seconds: number;
  talk_pct: number;
  turn_count: number;
  words_total: number;
  avg_turn_words: number;
  words_per_minute: number;
  questions_asked: number;
  interruptions_made: number;
}

export interface MeetingSignals {
  meeting_seconds: number;
  silence_seconds: number;
  participants: ParticipantSignals[];
}

function tsToSeconds(ts: RecallWord["start_timestamp"]): number | null {
  if (ts == null) return null;
  if (typeof ts === "number") return Number.isFinite(ts) ? ts : null;
  const r = ts.relative;
  return typeof r === "number" && Number.isFinite(r) ? r : null;
}

function speakerKey(seg: RecallSegment): string {
  return (
    seg.participant?.name?.trim() ||
    (seg.participant?.id != null ? `id:${seg.participant.id}` : "") ||
    (typeof seg.speaker === "string" ? seg.speaker : "") ||
    (seg.speaker_id != null ? `sp:${seg.speaker_id}` : "") ||
    "Participante"
  );
}

function segmentBounds(seg: RecallSegment): { start: number; end: number; text: string } | null {
  const words = seg.words ?? [];
  if (!words.length) return null;
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  const parts: string[] = [];
  for (const w of words) {
    const s = tsToSeconds(w.start_timestamp);
    const e = tsToSeconds(w.end_timestamp);
    if (s != null && s < start) start = s;
    if (e != null && e > end) end = e;
    if (w.text) parts.push(w.text);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end, text: parts.join(" ").trim() };
}

export function computeSignalsFromTranscript(transcript: unknown): MeetingSignals {
  const segments = Array.isArray(transcript) ? (transcript as RecallSegment[]) : [];

  type Acc = {
    talk_seconds: number;
    turn_count: number;
    words_total: number;
    questions_asked: number;
    interruptions_made: number;
  };
  const byParticipant = new Map<string, Acc>();
  const order: Array<{ key: string; start: number; end: number; words: number; isQuestion: boolean }> = [];

  let globalStart = Number.POSITIVE_INFINITY;
  let globalEnd = Number.NEGATIVE_INFINITY;

  for (const seg of segments) {
    const b = segmentBounds(seg);
    if (!b) continue;
    const key = speakerKey(seg);
    const words = seg.words?.length ?? 0;
    if (b.start < globalStart) globalStart = b.start;
    if (b.end > globalEnd) globalEnd = b.end;
    order.push({ key, start: b.start, end: b.end, words, isQuestion: /\?\s*$/.test(b.text) });

    if (!byParticipant.has(key)) {
      byParticipant.set(key, {
        talk_seconds: 0,
        turn_count: 0,
        words_total: 0,
        questions_asked: 0,
        interruptions_made: 0,
      });
    }
    const acc = byParticipant.get(key)!;
    acc.talk_seconds += b.end - b.start;
    acc.turn_count += 1;
    acc.words_total += words;
    if (/\?\s*$/.test(b.text)) acc.questions_asked += 1;
  }

  // Interrupções e silêncios — varrer order por tempo de início.
  order.sort((a, b) => a.start - b.start);
  let silence = 0;
  let lastEnd: { key: string; end: number } | null = null;
  for (const t of order) {
    if (lastEnd) {
      if (t.start < lastEnd.end - 0.25 && t.key !== lastEnd.key) {
        const acc = byParticipant.get(t.key);
        if (acc) acc.interruptions_made += 1;
      } else if (t.start > lastEnd.end + 3) {
        silence += t.start - lastEnd.end;
      }
    }
    if (!lastEnd || t.end > lastEnd.end) lastEnd = { key: t.key, end: t.end };
  }

  const meetingSeconds = Number.isFinite(globalEnd) && Number.isFinite(globalStart)
    ? Math.max(0, Math.round(globalEnd - globalStart))
    : 0;

  const participants: ParticipantSignals[] = [];
  for (const [name, acc] of byParticipant) {
    const talk = Math.round(acc.talk_seconds);
    const talkPct = meetingSeconds > 0 ? Math.round((talk / meetingSeconds) * 10000) / 100 : 0;
    const avgTurnWords = acc.turn_count > 0 ? Math.round((acc.words_total / acc.turn_count) * 100) / 100 : 0;
    const wpm = talk > 0 ? Math.round((acc.words_total / (talk / 60)) * 100) / 100 : 0;
    participants.push({
      participant_name: name,
      talk_seconds: talk,
      talk_pct: talkPct,
      turn_count: acc.turn_count,
      words_total: acc.words_total,
      avg_turn_words: avgTurnWords,
      words_per_minute: wpm,
      questions_asked: acc.questions_asked,
      interruptions_made: acc.interruptions_made,
    });
  }

  return {
    meeting_seconds: meetingSeconds,
    silence_seconds: Math.round(silence),
    participants,
  };
}
