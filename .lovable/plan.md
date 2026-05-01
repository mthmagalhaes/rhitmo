## Sprint 11.2 — Plug LLM (Lovable AI Gateway) into the Slack Conversational Machine

### Stability guarantees (what stays untouched)
- All slash commands (`/rhitmo`, `/nota`, `/kudos`, `/brief`, `/mentor`, `/meu-pdi`, `/meu-rhitmo`, `/review`, `/pdi`).
- All existing `block_actions` (`open_add_note`, `open_send_kudos`, `privacy_continue`, `action_meu_pdi`, URL buttons, etc.).
- `app_home_opened` welcome flow + throttle.
- Signature verification, persona resolution, modal handling, `processInteraction` / `processCommand` async pattern.

The new LLM path lives **only** inside the existing conversational hook (lines ~1707–1722 of `slack-bot/index.ts`), and the new "Conversar com a Rhitmo" button only adds a new `case` to the existing `block_actions` switch.

We use **Lovable AI Gateway** (`LOVABLE_API_KEY`, model `google/gemini-2.5-flash`), matching `chat-mentor` and project standards — no new secret needed.

---

### 1. Replace the placeholder ack with a real LLM turn

Inside the DM hook (right after `appendConversationTurn` of the user turn), instead of sending the "Recebi sua mensagem…" placeholder:

1. Return the Slack 200 OK **immediately** (already the pattern — the IIFE runs detached and the outer handler already returns 200 at line 1759). Wrap the LLM work in `EdgeRuntime.waitUntil(...)` when available so the runtime doesn't terminate the task; fall back to the existing fire-and-forget IIFE if not.
2. Build messages:
   - **System prompt** chosen by `conv.intent`. New helper `buildSystemPromptForIntent(intent)` with cases:
     - `general_chat` (and default): "Você é a inteligência artificial da Rhitmo, atuando como um mentor de liderança. Seja extremamente conciso, amigável e direto ao ponto. Responda usando formatação nativa do Slack (`*negrito*`, `_itálico_`, listas com `•`). Responda sempre em português do Brasil. Não invente dados sobre o time se não estiverem no histórico desta conversa."
     - `pulse_survey`, `1v1_prep`, `self_review` → minimal placeholder strings now (real prompts come in 11.3+). Keep the switch so adding intents is trivial.
   - Map `conv.state_data.turns` → `[{ role: 'user'|'assistant', content: turn.text }]`. Cap at the last 20 turns to bound context size.
3. New helper `callLovableAI(messages)` (top of file, near `slackApi`):
   - POST `https://ai.gateway.lovable.dev/v1/chat/completions`
   - `model: 'google/gemini-2.5-flash'`, `temperature: 0.6`, no streaming.
   - Reads `Deno.env.get('LOVABLE_API_KEY')`.
   - Handles 429 → returns "⏳ Rhitmo está sobrecarregado, tente em instantes." and 402 → "⚠️ Créditos de IA da workspace esgotados." Other errors → generic friendly message. Always returns a string so downstream code never throws.
4. After getting `assistantText`:
   - `appendConversationTurn(conv.id, { role: 'assistant', text: assistantText, ts: String(Date.now()/1000) })` (the existing helper already updates `last_message_at` and refreshes TTL).
   - `slackApi('chat.postMessage', { channel: event.channel, text: assistantText, mrkdwn: true })`.
5. `return` — keep short-circuit behavior so the welcome menu never fires when a conversation is active. Behavior on failure: log + post a friendly fallback message; never throw out of the hook.

This is the **only** change inside the DM branch. Welcome menu / throttle / persona / app_home logic remain bit-identical.

### 2. "Conversar com a Rhitmo" trigger button

`buildRhitmoMenu(persona)` (lines ~434–495) already branches per persona and emits an `actions` block. Add a new button to **leader** and **direct_report** branches (skip `hr_admin` for now — they have a different operational menu):

```text
{ type: 'button',
  text: { type: 'plain_text', text: '🌀 Conversar com a Rhitmo' },
  action_id: 'start_rhitmo_chat' }
```

Place it as a secondary button next to the existing primary actions to avoid visual disruption.

### 3. Handle the new action_id

In the `block_actions` switch (`processInteraction`, lines ~1256–1360), add:

```text
case 'start_rhitmo_chat': {
  const persona = await getUserPersona(slackUserId);
  if (persona.persona === 'unauthenticated' || !persona.workspaceId) {
    // Politely tell them to connect first. No conversation row created.
    await slackApi('chat.postMessage', {
      channel: slackUserId, // DM
      text: 'Conecte sua conta Rhitmo para conversar comigo. Use /rhitmo para começar.',
    });
    break;
  }

  // Idempotency: if an active conversation already exists, just nudge.
  const existing = await getActiveConversation(slackUserId);
  if (existing) {
    await slackApi('chat.postMessage', {
      channel: slackUserId,
      text: 'Já estamos numa conversa ativa 🌀 — é só me responder por aqui.',
    });
    break;
  }

  // Direct INSERT via service role client (already used elsewhere in the file).
  await supabaseAdmin.from('slack_conversations').insert({
    workspace_id: persona.workspaceId,
    slack_user_id: slackUserId,
    intent: 'general_chat',
    status: 'active',
    state_data: { turns: [] },
  });

  await slackApi('chat.postMessage', {
    channel: slackUserId,
    text: 'Olá! Eu sou o Mentor da Rhitmo 🌀, conectado ao seu Context Graph. Sobre o que você quer falar ou refletir hoje?',
  });
  break;
}
```

The partial unique index on `(slack_user_id) WHERE status='active'` (Sprint 11.1) protects against double-creation if the user spams the button.

### 4. Tiny housekeeping
- `default` log in the action switch already exists — no regression for unrelated buttons.
- Update `mem://features/slack/conversational-state-machine`: mark Sprint 11.2 as done, add the LLM call + `start_rhitmo_chat` trigger to the doc, keep "no LLM" line removed.

### 5. Files touched
- **Edited**: `supabase/functions/slack-bot/index.ts`
  - +`callLovableAI()` and `buildSystemPromptForIntent()` helpers near the top.
  - LLM call replaces the placeholder inside the conversational hook.
  - New button in `buildRhitmoMenu` (leader + direct_report).
  - New `start_rhitmo_chat` case in `block_actions` switch.
- **Edited**: `.lovable/memory/features/slack/conversational-state-machine.md` (status update).
- **No DB migration**, **no frontend changes**, **no new secrets**.

### Out of scope (next sprints)
- Per-intent prompt templates and structured flows (Pulse, 1:1 prep, Self-Review).
- Cron sweep for `expire_stale_slack_conversations()`.
- "Encerrar conversa" button to flip `status='completed'` (currently happens only via TTL expiration / manual cleanup).
- Streaming responses to Slack (Slack does not support SSE; would require chunked `chat.update` — explicitly out of scope).
