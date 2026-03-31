

## Plan: Bidirectional Slack OAuth Flow

### Prerequisites — Slack App Credentials

You need two additional secrets from your Slack App. Here's how to get them:

1. Go to **https://api.slack.com/apps** → select your Rhitmo app
2. Click **Basic Information** in the left sidebar
3. Under **App Credentials**, copy:
   - **Client ID** → will be stored as `SLACK_CLIENT_ID`
   - **Client Secret** → will be stored as `SLACK_CLIENT_SECRET`
4. Go to **OAuth & Permissions** in the left sidebar
5. Under **Redirect URLs**, add: `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-oauth-callback`

I will ask you to add these two secrets after the plan is approved, before implementing.

---

### Architecture

```text
FLOW A: Slack → Web (user runs /rhitmo, not linked)
─────────────────────────────────────────────────────
  Slack /rhitmo
    → slack-bot detects unauthenticated
    → generates HMAC-signed state token (slack_user_id + slack_team_id + timestamp)
    → returns button: "🔗 Conectar Conta" → rhitmo.lovable.app/slack/connect?state=...
    → user clicks → SlackConnect page
    → if not logged in → redirect to /auth?returnTo=/slack/connect?state=...
    → if logged in → calls slack-link with decoded state
    → success → "✅ Volte ao Slack!"

FLOW B: Web → Slack (user in Settings, bot not installed)
─────────────────────────────────────────────────────
  Settings page → "Adicionar ao Slack" button
    → opens Slack OAuth URL (https://slack.com/oauth/v2/authorize?...)
    → user installs bot → Slack redirects to slack-oauth-callback edge function
    → function exchanges code for token, extracts authed_user.id + team.id
    → generates same HMAC state token
    → redirects to rhitmo.lovable.app/slack/connect?state=...
    → same SlackConnect page handles linking
```

---

### Changes

**1. `supabase/functions/slack-bot/index.ts`** — Update unauthenticated response

- Add `generateStateToken(slackUserId, slackTeamId)` helper using HMAC-SHA256 with `SLACK_SIGNING_SECRET` as key
- State payload: `{slack_user_id}:{slack_team_id}:{unix_timestamp}` → HMAC hex → `base64url(payload):base64url(hmac)`
- In `buildRhitmoMenu`, when `unauthenticated`: return blocks with a button URL pointing to `https://rhitmo.lovable.app/slack/connect?state={token}`

**2. CREATE `supabase/functions/slack-oauth-callback/index.ts`** — OAuth code exchange

- Receives `?code=...` from Slack redirect
- Exchanges code via `https://slack.com/api/oauth.v2.access` with `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET`
- Extracts `authed_user.id` and `team.id` from response
- Generates same HMAC state token
- Returns HTTP 302 redirect to `https://rhitmo.lovable.app/slack/connect?state={token}`
- `verify_jwt = false` (no auth at this point)

**3. UPDATE `supabase/functions/slack-link/index.ts`** — Add state token verification mode

- Accept new optional field `{ state: "..." }` alongside existing `{ slack_user_id, slack_team_id }`
- If `state` is provided: verify HMAC, check timestamp (max 10 min), extract `slack_user_id` + `slack_team_id`
- Rest of logic (workspace lookup, upsert) stays the same

**4. CREATE `src/pages/SlackConnect.tsx`** — Connection landing page

- Reads `state` from URL query params
- If no user session → redirect to `/auth?returnTo=/slack/connect?state=...`
- If logged in → call `supabase.functions.invoke('slack-link', { body: { state } })`
- Show loading spinner during call
- Success: green checkmark + "Conta vinculada! Volte ao Slack e execute /rhitmo" 
- Error: message + link to settings

**5. UPDATE `src/App.tsx`** — Add route

- Add `/slack/connect` route rendering `SlackConnect`

**6. UPDATE `src/components/ProfileSettingsDialog.tsx`** — Replace manual inputs

- Remove manual Slack User ID / Team ID input fields
- If linked: show connected status + "Desconectar" button (keep existing)
- If not linked: show instructions + two buttons:
  - "Conectar via Slack" — link to Slack OAuth URL: `https://slack.com/oauth/v2/authorize?client_id={SLACK_CLIENT_ID}&scope=commands,chat:write&user_scope=&redirect_uri={callback_url}`
  - "Já tenho o bot instalado? Execute /rhitmo no Slack" — text instruction
- `SLACK_CLIENT_ID` stored as a `VITE_SLACK_CLIENT_ID` env var (public, safe to expose) OR hardcoded since it's a publishable key

**7. UPDATE `supabase/config.toml`** — Add new function entry

```toml
[functions.slack-oauth-callback]
verify_jwt = false
```

### Secrets Required

Before implementation, I will request:
- `SLACK_CLIENT_ID` — for OAuth URL construction and code exchange
- `SLACK_CLIENT_SECRET` — for code exchange (edge function only)

### No Database Changes

The existing `slack_integrations` table already has all needed columns.

### Technical Notes

- HMAC-SHA256 state tokens are tamper-proof and time-limited (10 min) — no encryption needed, just integrity verification
- `SLACK_SIGNING_SECRET` is reused as HMAC key for state tokens (already available in edge functions)
- The state token is NOT a JWT — it's a simple `payload:signature` format to keep it lightweight
- `SLACK_CLIENT_ID` is a public/publishable value (safe for frontend)

