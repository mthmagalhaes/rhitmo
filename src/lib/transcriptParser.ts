// Parses raw meeting transcript text into structured speaker turns so the
// Diário can render a Granola-style chat view instead of a wall of text.
//
// Recall.ai emits text formatted like:
//   "**Matheus Magalhães:** Oi Gabi, tudo bem? **Gabriela Lucas:** Tudo, ..."
// We split on **Speaker:** markers, then collapse consecutive turns by the
// same speaker. Uploaded Whisper transcripts have no speaker markers — we
// return a single "narration" turn so the UI still renders cleanly.

export interface TranscriptTurn {
  speaker: string;
  text: string;
}

const SPEAKER_RX = /\*\*\s*([^*:]{1,80}?)\s*:\s*\*\*/g;

export function parseTranscript(raw: string): TranscriptTurn[] {
  if (!raw) return [];
  const text = raw.replace(/\r\n/g, "\n");

  // No speaker markers → single narration turn (uploads / Whisper).
  if (!/\*\*[^*]+:\*\*/.test(text)) {
    const trimmed = text.trim();
    return trimmed ? [{ speaker: "Transcrição", text: trimmed }] : [];
  }

  const turns: TranscriptTurn[] = [];
  let lastIndex = 0;
  let currentSpeaker: string | null = null;
  let match: RegExpExecArray | null;

  const rx = new RegExp(SPEAKER_RX);
  while ((match = rx.exec(text)) !== null) {
    const chunk = text.slice(lastIndex, match.index).trim();
    if (currentSpeaker && chunk) {
      turns.push({ speaker: currentSpeaker, text: chunk });
    }
    currentSpeaker = match[1].trim();
    lastIndex = rx.lastIndex;
  }
  const tail = text.slice(lastIndex).trim();
  if (currentSpeaker && tail) {
    turns.push({ speaker: currentSpeaker, text: tail });
  }

  // Collapse consecutive same-speaker turns.
  const collapsed: TranscriptTurn[] = [];
  for (const t of turns) {
    const prev = collapsed[collapsed.length - 1];
    if (prev && prev.speaker === t.speaker) {
      prev.text = `${prev.text} ${t.text}`.trim();
    } else {
      collapsed.push({ ...t });
    }
  }
  return collapsed;
}

// Stable HSL color for a speaker name (used for the avatar circle).
export function colorForSpeaker(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue} 55% 45%)`;
}

export function speakerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
