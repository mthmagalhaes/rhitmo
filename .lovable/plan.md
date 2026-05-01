## Sprint 11.1 — Slack Bot Conversational State Machine (Foundation)

Goal: give the Slack bot **memory** so it can run multi-turn flows (Pulse, 1:1 prep, Self-Review). This sprint only lays the foundation: a state table + a routing hook intercepting DMs **before** the existing welcome menu. No LLM, no flow logic yet.

### What stays untouched (stability guarantees)
- All `/slash commands` (`/rhitmo`, `/nota`, `/kudos`, `/brief`, `/mentor`, `/review`, `/pdi`, etc.) — completely untouched.
- All `interactive` payloads (buttons, modals, message_action shortcuts) — untouched.
- `app_home_opened` welcome flow — untouched.
- `getUserPersona`, `slack_integrations`, throttling logic — untouched.
- Signature verification path — untouched.

The new conversational handler runs **only inside the `event.type === 'message' && event.channel_type === 'im'` branch**, and **before** the current welcome-menu block. If no active conversation exists, behavior falls through to the existing menu (zero regression).

---

### 1. Database — new table `slack_conversations`

Migration creates:

```text
slack_conversations
├── id              uuid PK default gen_random_uuid()
├── workspace_id    uuid NOT NULL
├── slack_user_id   text NOT NULL
├── status          slack_conversation_status NOT NULL default 'active'
├── intent          text NOT NULL  -- 'pulse_survey' | '1v1_prep' | 'self_review' | 'general_chat' | ...
├── state_data      jsonb NOT NULL default '{}'::jsonb
├── last_message_at timestamptz NOT NULL default now()
├── expires_at      timestamptz NOT NULL default (now() + interval '30 minutes')
├── created_at      timestamptz NOT NULL default now()
└── updated_at      timestamptz NOT NULL default now()
```

- Enum: `CREATE TYPE slack_conversation_status AS ENUM ('active','completed','expired');`
- Indexes:
  - `(slack_user_id, status)` — fast lookup of active conversation per user
  - `(workspace_id, status)` partial `WHERE status = 'active'` — housekeeping
  - `(expires_at)` for the expiration sweep
- Trigger: `set_updated_at` (BEFORE UPDATE) keeps `updated_at` fresh.
- Uniqueness rule: a partial unique index `(slack_user_id) WHERE status = 'active'` to guarantee **one active conversation per Slack user at a time**.
- RLS: enabled. Only `service_role` can read/write (Edge Function runs with service role). No client-side access — this table is server-only.
- Helper SQL function `get_active_slack_conversation(p_slack_user_id text)` returning the active row (or NULL), `SECURITY DEFINER`, used by the edge function for clean access.
- Helper SQL function `expire_stale_slack_conversations()` that flips `status='expired'` for rows where `expires_at < now()`. Will be wired to a cron later — not in this sprint.

### 2. Edge function — `slack-bot/index.ts`

Add two small helpers near the top of the file:

- `getActiveConversation(slackUserId)` — calls the RPC above via `safeRpc` (per project standard).
- `appendConversationTurn(conversationId, turn)` — updates `state_data.turns` (appended array) and bumps `last_message_at` + `expires_at = now() + 30min`.

Inside the existing DM handler (lines ~1638–1684), **before** the throttle/welcome menu block:

```text
if (event.type === 'message' && event.channel_type === 'im') {
  (async () => {
    const slackUserId = event.user;
    const persona = await getUserPersona(slackUserId);

    // NEW: conversational state machine hook
    if (persona.persona !== 'unauthenticated' && persona.workspaceId) {
      const conv = await getActiveConversation(slackUserId);
      if (conv) {
        await appendConversationTurn(conv.id, {
          role: 'user',
          text: event.text ?? '',
          ts: event.ts,
        });
        await slackApi('chat.postMessage', {
          channel: event.channel,
          text: '✅ Recebi sua mensagem. (estado atualizado — fluxo conversacional em construção)',
        });
        return; // short-circuit — do NOT fall into the welcome menu
      }
    }

    // EXISTING throttle + welcome menu logic (unchanged)
    ...
  })();
}
```

Result:
- If no active `slack_conversations` row exists → existing welcome menu path runs as today.
- If one exists → bot acknowledges and persists the turn into `state_data.turns`. No LLM call yet.

Conversations will be **created** later (Sprint 11.2+) by slash commands / buttons (e.g., starting a Pulse via `/rhitmo` opens a conversation row with `intent='pulse_survey'`).

### 3. No client changes
Frontend is not touched. No types regen needed beyond what the migration auto-produces in `src/integrations/supabase/types.ts`.

### 4. Memory update
Add `mem://features/slack/conversational-state-machine` describing:
- Table shape and one-active-per-user invariant.
- Hook position (DM event, before welcome menu, post-throttle).
- Convention for `state_data.turns: [{role, text, ts}]` and `intent` values.
Update `mem://index.md` with the reference line.

---

### Files touched
- New migration: `slack_conversations` table + enum + indexes + RLS + RPC helpers.
- Edited: `supabase/functions/slack-bot/index.ts` (add 2 helpers + conversational hook inside DM branch).
- New: `mem://features/slack/conversational-state-machine`, updated `mem://index.md`.

### Out of scope (next sprints)
- LLM wiring (OpenAI/Lovable AI), prompt design, intent classifier.
- Conversation **creation** triggers from slash commands / buttons.
- Cron sweep for `expire_stale_slack_conversations()`.
- UI to inspect ongoing conversations.