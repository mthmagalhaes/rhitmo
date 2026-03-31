

## Plan: Add Comprehensive Debugging to Slack Bot Edge Function

### Summary
Add detailed logging at every decision point in `slack-bot/index.ts` plus a GET health-check endpoint. This will reveal whether requests reach the function, where they fail (signature, routing, Slack API calls), and whether secrets are configured.

### Changes

**`supabase/functions/slack-bot/index.ts`** — Single file update

**1. GET health-check endpoint** (top of `Deno.serve` handler, before body parsing)
- Return JSON: `{ status: "alive", hasToken: bool, hasSigningSecret: bool, hasSupabaseUrl: bool, timestamp: string }`
- This confirms the function is deployed and secrets are set

**2. Logging in `Deno.serve` entry**
- Log method, URL, content-type, presence of `x-slack-signature` and `x-slack-request-timestamp` headers
- Log raw body length (NOT full body, to avoid leaking tokens)

**3. Logging in `verifySlackSignature`**
- Log whether signing secret exists
- Log whether timestamp and signature headers are present
- Log timestamp delta (current time minus request timestamp)
- Log calculated hex digest vs received signature (first 10 chars only, for safety)
- Log final pass/fail result

**4. Logging in command routing**
- Log parsed `command`, `user_id`, `channel_id`, `text` length
- Log which case was matched

**5. Logging in `getUserPersona`**
- Log slack user ID being looked up
- Log whether integration record was found
- Log which persona was determined and why

**6. Logging in `slackApi` helper**
- Log method name and body keys before each call
- Log response `ok` field and `error` field from Slack API response
- This catches invalid tokens or missing scopes immediately

**7. Wrap each command handler in try-catch**
- `handleRhitmoCommand`, `handleNotaCommand`, `handleKudosCommand` each get individual try-catch with detailed error logging

### What this does NOT change
- No logic changes — all existing behavior preserved
- No new dependencies
- No database changes
- No config.toml changes needed (entry already exists)

### Technical Notes
- Logs are viewable via edge function logs tool after each Slack command attempt
- Secret values are never logged — only boolean existence checks
- Signature hex is truncated to prevent replay attacks from logs

