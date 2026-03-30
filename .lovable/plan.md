

## Plan: Slack App Integration — Phase 1 (Foundation)

### Important Constraint

The Lovable Slack connector does **not** support slash commands (`commands` scope). This means a **custom Slack app** is required. The user will need to:
1. Create a Slack app at https://api.slack.com/apps
2. Configure slash commands pointing to our edge function URL
3. Store bot token and signing secret as project secrets

This is a large feature. I recommend building it in phases. This plan covers **Phase 1**: database tables, the core edge function handler, OAuth linking, and the first 3 leader commands (`/rhitmo`, `/nota`, `/kudos`).

### Phase 1 Changes

**1. Database Migration** — Create 3 tables

- `slack_integrations` — Links Slack user IDs to Rhitmo user IDs (columns: `id`, `user_id`, `workspace_id`, `slack_user_id`, `slack_team_id`, `created_at`). No access token stored here — the bot token is a single secret, not per-user.
- `kudos` — Public recognition records (columns: `id`, `workspace_id`, `from_user_id`, `to_member_id`, `message`, `slack_channel_id`, `slack_message_ts`, `created_at`)
- `feedback_streaks` — Gamification tracking (columns: `id`, `user_id`, `workspace_id`, `current_streak`, `longest_streak`, `last_feedback_date`, `created_at`, `updated_at`)
- RLS on all three tables scoped to `auth.uid()`
- `update_feedback_streak()` SECURITY DEFINER function

**2. Create `supabase/functions/slack-bot/index.ts`** — Single edge function handling all Slack interactions

Architecture: **NOT** using Slack Bolt SDK (incompatible with Deno edge functions). Instead, raw HTTP request handler that:
- Validates Slack request signatures using `SLACK_SIGNING_SECRET`
- Handles Slack URL verification challenge
- Routes slash commands by `command` field
- Routes interactive payloads by `action_id`

Implements these commands:
- `/rhitmo` — Interactive menu with buttons based on persona (leader/direct report/HR)
- `/nota @member text` — Creates private feedback, updates streak, sends ephemeral confirmation
- `/kudos @member text` — Posts public message to channel, saves to `kudos` table

Helper: `getUserPersona(slackUserId)` — Looks up `slack_integrations` → checks workspace ownership → returns role

**3. Create `supabase/functions/slack-link/index.ts`** — Account linking endpoint

Simple edge function that:
- Receives authenticated request from Rhitmo frontend (JWT validated)
- Accepts `slack_user_id` and `slack_team_id`
- Upserts into `slack_integrations`
- Returns success

This avoids OAuth complexity — users just run `/rhitmo connect` in Slack which gives them a link to Rhitmo where they click "Link Account".

**4. Add secrets** — Two new secrets needed:
- `SLACK_BOT_TOKEN` — Bot User OAuth Token from custom Slack app
- `SLACK_SIGNING_SECRET` — Signing Secret from custom Slack app

**5. Frontend: Settings page integration**

Add a "Slack" section to the existing settings/profile area:
- Shows connection status (linked/unlinked)
- "Link Slack Account" button that opens a modal to enter Slack user ID (or ideally uses a deep link)
- Display linked Slack username when connected

**6. Update `supabase/config.toml`** — Add entries for new edge functions with `verify_jwt = false` (Slack sends its own signature verification)

### What Phase 1 Does NOT Include
- Direct report commands (`/meu-feedback`, `/meu-pdi`) — Phase 2
- HR commands (`/rh-overview`, `/rh-alerts`) — Phase 2
- Proactive automations (pre-meeting DMs, weekly digests) — Phase 3
- `upcoming_oneonones` table — Phase 3
- `/brief` and `/review` commands (depend on existing edge functions working via internal calls) — Phase 2

### User Setup Guide (provided after implementation)

1. Go to https://api.slack.com/apps → "Create New App" → "From a manifest"
2. Paste provided JSON manifest (with edge function URL pre-filled)
3. Install app to workspace
4. Copy Bot Token → add as `SLACK_BOT_TOKEN` secret
5. Copy Signing Secret → add as `SLACK_SIGNING_SECRET` secret
6. Team members run `/rhitmo` and follow the link to connect accounts

### Technical Notes
- Slack Bolt SDK uses Node.js patterns incompatible with Deno edge functions. We use raw `Deno.serve` with manual signature verification instead.
- Slack request signature verification uses HMAC-SHA256 with the signing secret — this is the security layer replacing JWT.
- All slash command responses are ephemeral (private to the user) except `/kudos` which posts publicly.
- The `feedback_streaks` function uses weekly cadence (not daily) — a manager giving feedback once per week maintains their streak, which is more realistic than daily.
- Foreign key references to `auth.users` will NOT be used per project guidelines. `user_id` columns reference user IDs without FK constraints.

