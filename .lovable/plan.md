

## Plan: Add 2-Pass Transcript Summarization to `meu-rhitmo` Edge Function

### What's already done
- `chat-mentor/index.ts` already has: `isLongTranscript()`, `isExcessivelyLong()`, `summarizeTranscript()`, and the full 2-pass pipeline (lines 110-588)
- `MentorChat.tsx` frontend already has: progressive loading stages, `lastSummaryApplied` state, and handles `metadata.summary_applied` from responses
- The only missing piece: **`meu-rhitmo/index.ts` sends long transcripts raw** without summarization

### Changes

**`supabase/functions/meu-rhitmo/index.ts`** — Add the same 2-pass summarization

1. Add `isLongTranscript()` and `isExcessivelyLong()` detection functions (same as chat-mentor)
2. Add `summarizeTranscript()` function using `gpt-4o-mini` for structured extraction
3. Before building `apiMessages`, check for long transcripts:
   - If >15,000 words → return 400 error
   - If >800 words + timestamps/speakers → run Pass 1 (summarize), then use compressed output for Pass 2
4. Return `metadata.summary_applied` in the response so the frontend shows the "Resumo inteligente" badge

### Technical details

The three utility functions are identical to what's in `chat-mentor/index.ts`:
- `isLongTranscript(text)`: checks wordCount > 800 AND (hasTimestamps OR hasMultipleSpeakers)
- `isExcessivelyLong(text)`: checks wordCount > 15,000
- `summarizeTranscript(text, apiKey)`: calls gpt-4o-mini to extract JSON with participants, topics, decisions, actions, attention points

The summarization output replaces the raw `question` before it's sent to gpt-4o for the final response, prepending `[TRANSCRIÇÃO DE REUNIÃO PROCESSADA]` with the structured summary.

No frontend changes needed — `MentorChat.tsx` already handles both modes identically for progressive loading and metadata display.

