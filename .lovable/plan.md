## Correção

Você está certo — a memória [Slack App Naming](mem://features/slack/app-naming) diz para manter "Rhitmo". O manifest em `docs/slack-app-manifest.md` está com `"name": "Rhy"` e `"display_name": "Rhy"`, contrariando essa regra.

## Mudanças em `docs/slack-app-manifest.md`

1. `display_information.name`: `"Rhy"` → `"Rhitmo"`
2. `features.bot_user.display_name`: `"Rhy"` → `"Rhitmo"`
3. Cabeçalho do doc: remover "App name: Rhy (anteriormente Rhitmo)" e "Bot user: @rhy" → voltar para "Rhitmo" / "@rhitmo"

Scopes (`groups:write`, `mpim:write`) permanecem — esse era o objetivo original da mudança.

## Manifest final (paste-ready)

```json
{
  "display_information": {
    "name": "Rhitmo",
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
      "display_name": "Rhitmo",
      "always_online": true
    },
    "slash_commands": [
      { "command": "/rhitmo",     "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Menu principal Rhitmo", "should_escape": true },
      { "command": "/nota",       "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Registrar observação privada sobre liderado", "usage_hint": "@liderado o que aconteceu", "should_escape": true },
      { "command": "/kudos",      "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Reconhecimento público", "usage_hint": "@liderado mensagem", "should_escape": true },
      { "command": "/brief",      "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Resumo pré-1:1", "usage_hint": "@liderado", "should_escape": true },
      { "command": "/mentor",     "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Chat IA com a Rhitmo", "usage_hint": "sua pergunta", "should_escape": true },
      { "command": "/meu-pdi",    "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Ver meu PDI (liderados)", "should_escape": true },
      { "command": "/meu-rhitmo", "url": "https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot", "description": "Resumo executivo do liderado", "should_escape": true }
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
        "groups:write",
        "groups:history",
        "mpim:write",
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

## Observação importante

No painel do Slack (https://api.slack.com/apps), o app já está cadastrado como **"Rhy"**. Renomear para "Rhitmo" via manifest vai mudar o display name do bot no workspace Faster (vira `@rhitmo` de novo). Se preferir, posso só corrigir o doc e manter o app como "Rhy" no Slack — me confirma antes de aplicar.
