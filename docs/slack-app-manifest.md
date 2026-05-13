# Rhitmo — Slack App Manifest

Source of truth for the Rhitmo custom Slack App configuration.

- **App name:** Rhy (anteriormente "Rhitmo")
- **Bot user:** `@rhy`
- **Production app ID:** `B0APL6ST719`
- **Workspace (dev):** Faster (`THC407Z8A`)

If you ever recreate the Slack App (or stand up a staging app), paste the manifest below at https://api.slack.com/apps → "Create New App" → "From an app manifest".

> Whenever you change a slash command or scope here, also update:
> - `src/lib/slackCommands.ts` (UI / marketing source of truth)
> - The `case` branches in `supabase/functions/slack-bot/index.ts`

---

## Required scopes (bot token)

```
commands
chat:write
chat:write.public
users:read
users:read.email
im:history
im:write
im:read
channels:join
channels:read
channels:history
groups:read
groups:write
groups:history
mpim:write
app_mentions:read
```

> `groups:write` + `mpim:write` habilitam o botão nativo do Slack **"Adicionar o app a um canal"** (menu "..." → Mais ações → Abrir detalhes do app) para canais privados e group DMs, sem precisar de `/invite @Rhitmo` manual.

## Slash commands (7)

All point to `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot`.

| Command | Description | Privacy |
|---|---|---|
| `/rhitmo` | Menu principal com todas as ações | menu |
| `/nota` | Registrar observação privada sobre um liderado | private |
| `/kudos` | Reconhecimento público no canal | public |
| `/brief` | Resumo consolidado pré-1:1 de um liderado | private |
| `/mentor` | Chat IA contextual com a Rhitmo | private |
| `/meu-pdi` | Ver seu plano de desenvolvimento (liderados) | private |
| `/meu-rhitmo` | Resumo executivo do seu momento (liderados) | private |

For **every** slash command, the **"Escape channels, users, and links sent to your app"** flag MUST be enabled. The bot's `resolveMember()` parser depends on receiving `<@U…>` mentions, not raw `@name` text. See `mem://features/slack/configuration-constraints`.

## Event subscriptions

Request URL: `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot`

Bot events:
- `message.im` — DM to the bot (handler in `slack-bot` line ~1802)
- `app_home_opened` — App Home opened on the Messages tab (handler line ~1921)
- `app_mention` — bot @-mention in a channel *(scope present, handler not implemented yet — safe to subscribe)*

## Interactivity

Request URL: `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot`

Used by the buttons rendered inside `/rhitmo` menu and pulse/brief DM cards.

## OAuth & Permissions

Redirect URLs:
- `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-oauth-callback`

## App Home

- **Home tab:** **MUST be disabled.** Não publicamos `views.publish` em `app_home_opened` — se a Home tab estiver ON, a aba "Início" exibe loading infinito no Slack.
- **Messages tab:** **enabled** + **"Allow users to send Slash commands and messages from the messages tab"** must be ON.
- Resultado esperado: bot mostra apenas 2 abas no Slack — **Mensagens** e **Sobre** (a aba "Sobre" é gerada automaticamente pelo Slack a partir de `display_information` e não pode ser ocultada).

---

## Manifest JSON (paste-ready)

```json
{
  "display_information": {
    "name": "Rhy",
    "description": "AI-Native Leadership Partner",
    "background_color": "#1a1a1a"
  },
  "features": {
    "app_home": {
      "home_tab_enabled": false,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "bot_user": {
      "display_name": "Rhy",
      "always_online": true
    },
    "slash_commands": [
      { "command": "/rhitmo",     "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Menu principal Rhitmo",                       "should_escape": true },
      { "command": "/nota",       "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Registrar observação privada sobre liderado", "usage_hint": "@liderado o que aconteceu", "should_escape": true },
      { "command": "/kudos",      "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Reconhecimento público",                       "usage_hint": "@liderado mensagem",          "should_escape": true },
      { "command": "/brief",      "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Resumo pré-1:1",                               "usage_hint": "@liderado",                   "should_escape": true },
      { "command": "/mentor",     "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Chat IA com a Rhitmo",                         "usage_hint": "sua pergunta",                "should_escape": true },
      { "command": "/meu-pdi",    "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Ver meu PDI (liderados)",                                                                  "should_escape": true },
      { "command": "/meu-rhitmo", "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Resumo executivo do liderado",                                                              "should_escape": true }
    ]
  },
  "oauth_config": {
    "redirect_urls": [
      "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-oauth-callback"
    ],
    "scopes": {
      "bot": [
        "commands",
        "chat:write",
        "chat:write.public",
        "users:read",
        "users:read.email",
        "im:history",
        "im:write",
        "im:read",
        "channels:join",
        "channels:read",
        "channels:history",
        "groups:read",
        "groups:history",
        "app_mentions:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot",
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "message.im"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot"
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

---

## Audit checklist (run after any reinstall)

1. `auth.test` returns `team: "Faster"` and `user: "rhitmo"`.
2. `x-oauth-scopes` header lists all 14 scopes above.
3. From Slack, run `/rhitmo` — menu must render.
4. Type `/` in Slack message box — exactly **7** Rhitmo commands appear.
5. Open a DM to `@Rhitmo` — bot should reply (handler `message.im`).
6. Open the App Home → Messages tab — welcome DM should arrive once per 24h (handler `app_home_opened`).
