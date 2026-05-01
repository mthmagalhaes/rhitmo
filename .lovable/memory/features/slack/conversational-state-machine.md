---
name: Slack Conversational State Machine
description: Foundation for multi-turn DM flows on Slack via slack_conversations table; one active conversation per Slack user, hook in slack-bot DM branch
type: feature
---

# Slack Conversational State Machine (Sprint 11.1 — Foundation)

## Goal
Give the Slack bot multi-turn memory so flows like Pulse Survey, 1:1 Prep, and Self-Review can run as a real conversation.

## Database
- Table `public.slack_conversations` (workspace_id, slack_user_id, status, intent, state_data jsonb, last_message_at, expires_at, timestamps).
- Enum `slack_conversation_status`: `active | completed | expired`.
- **Invariant**: a partial unique index `(slack_user_id) WHERE status = 'active'` enforces **one active conversation per Slack user** at a time.
- Default TTL: 30 minutes (`expires_at = now() + 30m`), refreshed on every appended turn.
- RLS: server-only (service_role policy). No client access.

## Helper RPCs (SECURITY DEFINER, service_role only)
- `get_active_slack_conversation(p_slack_user_id text) → slack_conversations` — returns the single active row whose `expires_at > now()` or NULL.
- `append_slack_conversation_turn(p_conversation_id uuid, p_turn jsonb, p_ttl_minutes int default 30)` — appends to `state_data.turns[]` (created if missing) and bumps `last_message_at` + `expires_at`.
- `expire_stale_slack_conversations()` — flips `status='expired'` for rows past TTL. To be wired to a cron in a later sprint.

EXECUTE on these RPCs is revoked from public/anon/authenticated; only service_role can call them.

## Edge function hook (`supabase/functions/slack-bot/index.ts`)
- Helpers `getActiveConversation()` and `appendConversationTurn()` defined near the top of the file (~line 13).
- The hook lives **inside** the existing DM branch (`event.type === 'message' && event.channel_type === 'im'`), placed right after `getUserPersona()` and **before** the throttle/welcome-menu logic.
- Behavior:
  - Authenticated user with active conversation → append turn, send a placeholder ack ("Recebi sua mensagem…"), and `return` (skip welcome menu).
  - No active conversation → fall through to existing welcome menu (zero regression).
- On any error, hook silently returns null and falls through.

## What is **out of scope** for Sprint 11.1
- LLM wiring (no OpenAI/Lovable AI calls yet).
- Conversation **creation** — no slash command or button creates rows yet.
- Cron job for `expire_stale_slack_conversations()`.
- UI to inspect ongoing conversations.

## State data convention
```jsonc
{
  "turns": [
    { "role": "user", "text": "...", "ts": "1714..." },
    { "role": "assistant", "text": "..." }
  ],
  // Flow-specific keys live alongside `turns`:
  // pulse_survey: { current_question_index, pulse_id }
  // 1v1_prep:     { meeting_id, draft }
  // self_review:  { review_id, current_question_index }
}
```

## Intents (allowed values, free text by convention)
`pulse_survey`, `1v1_prep`, `self_review`, `general_chat`. New flows simply add a new intent string.

## Stability guarantees
- All slash commands, interactive payloads, message_action shortcuts, and `app_home_opened` flows remain untouched.
- Welcome-menu throttling logic is unchanged; the hook only short-circuits **above** it when a conversation exists.
