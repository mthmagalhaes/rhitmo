

## Plan: Slack Privacy Protection Layers

### Summary
Add 3 protection layers for sensitive Slack commands: (1) privacy onboarding dialog after account linking, (2) public channel detection with warning + escape hatch, (3) DM-only enforcement for `/review`. Also add interactivity handler for button clicks.

### Changes

**1. Database Migration — Add `hide_slack_privacy_tips` column**

```sql
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS hide_slack_privacy_tips BOOLEAN DEFAULT false;
```

No new RLS needed — existing policies already cover user_preferences CRUD.

**2. CREATE `src/components/slack/SlackPrivacyOnboarding.tsx`**

- Dialog component with 3 styled cards (Rhitmo design: `rounded-2xl`, soft shadows):
  - Card 1: Shield icon — Private commands (`/nota`, `/brief`, `/review`) → use in DM/private channels
  - Card 2: Megaphone icon — Public commands (`/kudos`) → use in public channels
  - Card 3: Lock icon — Why this matters (preview visibility while typing)
- "Não mostrar novamente" checkbox → saves `hide_slack_privacy_tips: true` to `user_preferences`
- "Entendi" primary button to close

**3. UPDATE `src/pages/SlackConnect.tsx`**

- After successful linking, check `user_preferences.hide_slack_privacy_tips`
- If not hidden, show `SlackPrivacyOnboarding` dialog before the success screen
- Flow: link succeeds → fetch preference → if not hidden, show dialog → on close, show success

**4. UPDATE `supabase/functions/slack-bot/index.ts` — Privacy detection + interactivity**

Add constants:
```typescript
const SENSITIVE_COMMANDS = ['/nota', '/brief', '/review', '/meu-pdi'];
const DM_ONLY_COMMANDS = ['/review'];
```

Add `isPublicChannel(channelId)` helper:
- Calls `conversations.info` via Slack API with bot token
- Returns `!channel.is_private` (public = true)
- Simple in-memory cache (Map with 5-min TTL)

In `processCommand`, before routing to handlers:
- For `DM_ONLY_COMMANDS`: if `channel_type !== 'im'`, send ephemeral hard block via `response_url` and return
- For `SENSITIVE_COMMANDS` in public channels: send warning with interactive buttons (Continue / Cancel) via `response_url`, storing original command info in `callback_id`

Add interactivity handler in main `Deno.serve`:
- Detect `application/x-www-form-urlencoded` payloads where `payload` param exists (Slack interactive components)
- Parse JSON from `payload` param
- Verify signature
- Extract `actions[0].value` — if `continue_public`, re-execute original command; if `cancel`, send cancellation message
- Return 200 immediately, process async

**5. UPDATE `src/components/ProfileSettingsDialog.tsx`**

- Add "Boas Práticas" section in the Slack integration area
- Button "Ver Novamente" to reopen `SlackPrivacyOnboarding`
- Small table showing command privacy classification

### Technical Notes

- Interactivity requires configuring the **Interactivity Request URL** in the Slack App settings to point to the same `slack-bot` edge function URL. User will need to do this manually.
- The `conversations.info` call uses the bot token already available as `SLACK_BOT_TOKEN`.
- Channel type `im` is provided in slash command payloads as `channel_type` param — no extra API call needed for DM detection.
- For public channel detection on non-DM channels, we call `conversations.info` since `channel_type` only distinguishes `im` vs others.

