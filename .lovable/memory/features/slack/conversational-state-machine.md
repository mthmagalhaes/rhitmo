---
name: Slack Conversational State Machine
description: Multi-turn DM flows on Slack via slack_conversations + Lovable AI; one active conversation per user, "Conversar com a Rhitmo" trigger button creates general_chat sessions
type: feature
---

# Slack Conversational State Machine

## Status
- **Sprint 11.1 (foundation)** — DONE: table, RPCs, DM hook with placeholder ack.
- **Sprint 11.2 (LLM + trigger)** — DONE: Lovable AI Gateway wired, `start_rhitmo_chat` button creates `general_chat` conversations.
- **Sprint 18 (conversational by default)** — DONE: DM autenticada SEM conversa ativa **auto-cria** uma `general_chat` no próprio handler de DM (slack-bot/index.ts ~linha 2234) e responde via LLM no mesmo turno. Welcome menu nunca mais aparece como resposta a DM autenticada — só em `app_home_opened` (1ª vez) ou para `unauthenticated`. Welcome DM do `slack-link` foi reescrita pra dizer "é só me mandar uma mensagem aqui no DM".

## Goal
Give the Slack bot multi-turn memory + real LLM responses so flows like Pulse Survey, 1:1 Prep, Self-Review, and free chat run as a real conversation.

## Database (`public.slack_conversations`)
- Columns: `workspace_id`, `slack_user_id`, `status` (`active|completed|expired`), `intent`, `state_data jsonb`, `last_message_at`, `expires_at`, timestamps.
- **Invariant**: partial unique index `(slack_user_id) WHERE status='active'` → **one active conversation per Slack user** at a time.
- TTL: 30 minutes, refreshed on every appended turn.
- RLS: server-only (service_role).

## Helper RPCs (SECURITY DEFINER, service_role only)
- `get_active_slack_conversation(p_slack_user_id text)` → row or NULL (only if `expires_at > now()`).
- `append_slack_conversation_turn(p_conversation_id, p_turn jsonb, p_ttl_minutes default 30)` → appends to `state_data.turns[]`, bumps `last_message_at` + `expires_at`.
- `expire_stale_slack_conversations()` → flips `status='expired'` past TTL (cron not wired yet).

## Edge function (`supabase/functions/slack-bot/index.ts`)

### Helpers (top of file)
- `getActiveConversation(slackUserId)` / `appendConversationTurn(convId, turn)` (Sprint 11.1).
- `buildSystemPromptForIntent(intent)` — switch over `general_chat | pulse_survey | 1v1_prep | self_review` (Sprint 11.2).
- `callLovableAI(messages)` — POSTs to `https://ai.gateway.lovable.dev/v1/chat/completions` with `model: google/gemini-2.5-flash`, temperature 0.6. Always returns a string; maps 429→friendly message, 402→credits exhausted message, never throws.

### DM hook (inside the `event.type === 'message' && event.channel_type === 'im'` branch, before throttle/welcome menu)
1. If authenticated user has an active conversation:
   - `appendConversationTurn(role: 'user', text, ts)`.
   - Build messages: `[system(intent), ...last 20 turns mapped to {role, content}]`.
   - Call `callLovableAI()` and append the assistant turn back into state.
   - Post the assistant text to Slack with `chat.postMessage` (`mrkdwn: true`).
   - The LLM call is wrapped in `EdgeRuntime.waitUntil(...)` when available so the runtime keeps the task alive after the outer 200 OK is returned to Slack (Slack 3-second SLA respected). Falls back to detached IIFE.
2. No active conversation → falls through to existing welcome menu (zero regression).
3. Errors silently log + post a friendly "tente de novo" message; never throw out of the hook.

### Trigger: `start_rhitmo_chat` button
- Added to `buildRhitmoMenu` for **leader** and **direct_report** personas (skipped for `hr_admin` for now). Label: "🌀 Conversar com a Rhitmo".
- Handler in `processInteraction` block_actions switch:
  - Resolves persona; if unauthenticated → asks them to connect.
  - If active conversation already exists → posts "Já estamos numa conversa ativa, é só responder".
  - Else `INSERT INTO slack_conversations (workspace_id, slack_user_id, intent='general_chat', status='active', state_data={turns:[]})`. The partial unique index protects against double-creation.
  - Sends opening DM: "Olá! Eu sou o Mentor da Rhitmo 🌀, conectado ao seu Context Graph. Sobre o que você quer falar ou refletir hoje?"

## State data convention
```jsonc
{
  "turns": [
    { "role": "user", "text": "...", "ts": "1714..." },
    { "role": "assistant", "text": "...", "ts": "1714..." }
  ]
  // Flow-specific keys live alongside `turns`:
  // pulse_survey: { current_question_index, pulse_id }
  // 1v1_prep:     { meeting_id, draft }
  // self_review:  { review_id, current_question_index }
}
```

## Intents
`general_chat` (default), `pulse_survey`, `1v1_prep`, `self_review`. New flows just add a new intent string + a case in `buildSystemPromptForIntent`.

## Stability guarantees
- All slash commands, modals, message_action shortcuts, `app_home_opened`, throttle, persona resolution, and signature verification remain unchanged.
- The LLM hook only short-circuits **above** the welcome menu when an active conversation exists.
- No new secret needed — uses the existing `LOVABLE_API_KEY`.

## Out of scope (future sprints)
- Per-intent prompt templates and structured Pulse / 1:1 / Self-Review flows over Slack.
- Cron sweep wiring for `expire_stale_slack_conversations()`.
- "Encerrar conversa" button to flip `status='completed'` (currently TTL-only).
- Streaming responses to Slack (Slack does not support SSE; would require chunked `chat.update`).
