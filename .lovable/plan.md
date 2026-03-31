

## Plan: Refactor Slack Bot to Immediate-Ack + response_url Pattern

### Diagnosis from Logs

The logs reveal the function **is** receiving requests and processing them successfully — signature verification passes, commands route correctly. However, two problems exist:

1. **Timing**: The handler `await`s all DB queries and Slack API calls before returning 200. If this exceeds 3 seconds, Slack shows "dispatch_failed".
2. **channel_not_found**: `chat.postEphemeral` fails with `channel_not_found` for DM channel IDs (e.g., `D04MHSU2P3M`). Using `response_url` instead bypasses this entirely since Slack handles delivery.

### Changes

**Single file: `supabase/functions/slack-bot/index.ts`**

**1. Immediate 200 + async processing**

Restructure `Deno.serve` handler to:
- Read body and headers
- Handle retries (`X-Slack-Retry-Num` header → return 200 immediately)
- Handle JSON `url_verification` synchronously (required by Slack setup)
- For slash commands: return `new Response('', { status: 200 })` **immediately**, then fire `processCommand()` without `await`
- Store `response_url` from the parsed params — this is Slack's webhook for delayed responses

**2. New `processCommand()` async function**

Contains all current logic (signature verification, persona lookup, command routing) but sends responses via `response_url` instead of `chat.postEphemeral`/`chat.postMessage`:

```text
processCommand(body, headers, params)
  → verifySlackSignature()
  → getUserPersona()
  → route to command handler
  → POST result to response_url
```

**3. Refactor command handlers to return message objects**

Instead of calling `slackApi('chat.postEphemeral', ...)` directly, each handler returns a message payload (`{ text, blocks }`). The `processCommand` wrapper sends it to `response_url`.

Exception: `/kudos` still uses `slackApi('chat.postMessage', ...)` for the public channel message, but the ephemeral confirmation uses `response_url`.

**4. Add `sendDelayedResponse()` helper**

```text
sendDelayedResponse(responseUrl, message, responseType = 'ephemeral')
  → fetch(responseUrl, { method: 'POST', body: { response_type, ...message } })
```

**5. Retry handling**

At the top of the POST handler, check `X-Slack-Retry-Num` header. If present, log and return 200 without processing (prevents duplicate command execution).

**6. Error safety**

Wrap the entire `Deno.serve` in try-catch that always returns 200 to Slack. Errors are logged but never surface as 500s.

### What stays the same
- `verifySlackSignature()` — no changes
- `getUserPersona()` — no changes  
- Database operations (feedbacks insert, streak update, kudos insert) — no changes
- Health check GET endpoint — no changes
- `config.toml` — no changes needed

### Technical Notes
- `response_url` is included in every Slack slash command payload and is valid for 30 minutes
- This pattern eliminates the `channel_not_found` error since we no longer call `chat.postEphemeral` for command responses
- Deno edge functions keep running after the response is sent, so fire-and-forget `processCommand()` works correctly
- `/kudos` is the only command that still needs `slackApi` — for posting the public message to the channel

