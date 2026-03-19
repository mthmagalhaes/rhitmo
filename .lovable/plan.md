

## Plan: Long Transcript Summarization in MentorChat (2-Pass)

### Overview
Add a 2-pass summarization pipeline for long meeting transcripts in chat-mentor. When the user's message exceeds 800 words (or looks like a transcript), the system first extracts structured data, then generates coaching advice based on the summary instead of the raw text.

### Backend: `supabase/functions/chat-mentor/index.ts`

**1. Add transcript detection function** (after `compressContext` helper, ~line 108):
- `isLongTranscript(text)`: returns true if word count > 800 AND (has timestamps OR has multiple speaker patterns)
- `isExcessivelyLong(text)`: returns true if word count > 15000 → reject with error

**2. Add summarization function** (~after detection):
- `summarizeTranscript(text, openAIApiKey)`: calls OpenAI with a structured extraction prompt (participants, topics, decisions, actions, attention points) using `gpt-4o-mini`, temperature 0.3, max_tokens 2000

**3. Modify main handler** (after line 206, after router decision):
- Before building the system prompt, check if `question` is a long transcript
- If excessively long (>15k words): return 400 error
- If long transcript: call `summarizeTranscript` to get structured summary
- Replace the raw question in `apiMessages` with a condensed version: the structured JSON summary + the original question's first 200 chars as context
- Add metadata to response: `{ processed_as_long_transcript: true, summary_applied: true, processing_time_ms }`

**4. Modify response** (line 588):
- Include metadata in JSON response alongside `response`

### Frontend: `src/components/MentorChat.tsx`

**5. Add progressive loading messages** (in `handleSend`, ~line 236):
- When `input.split(/\s+/).length > 800`: cycle through loading messages:
  - "Analisando transcrição..." → "Extraindo tópicos e decisões..." → "Gerando sugestões contextualizadas..."
- Use `setLoadingMessage` with intervals

**6. Show "Resumo inteligente" badge** (in message rendering):
- Store metadata from response in state
- If last assistant message was generated with `summary_applied: true`, show a `<Badge>` with Sparkles icon and tooltip explaining the 2-pass process

### Technical Details

```text
User sends long transcript (>800 words)
  │
  ├─ >15k words? → Return error "Transcrição muito longa"
  │
  ├─ Pass 1: gpt-4o-mini extracts structured JSON
  │   (participants, topics, decisions, actions, risks)
  │   ~2s, low cost
  │
  └─ Pass 2: gpt-4o generates coaching response
      using summary + leader context + conversation history
      ~5s, normal cost
```

Total: ~7-10s processing, well within 45s timeout. Cost increase is minimal since Pass 1 uses gpt-4o-mini.

### Files Changed
1. `supabase/functions/chat-mentor/index.ts` — add detection + summarization + metadata
2. `src/components/MentorChat.tsx` — progressive loading + summary badge

