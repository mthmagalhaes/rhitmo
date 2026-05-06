---
name: Slack App Naming
description: Slack app/bot name stays "Rhitmo" — do NOT rename to "Rhy" in Slack panel or manifest
type: constraint
---

O app Slack mantém o nome **Rhitmo** (display name, bot user, manifest). Decisão do usuário em Sprint 18.

**Não renomear** para "Rhy" no painel `api.slack.com/apps` nem no `docs/slack-app-manifest.md`:
- `display_information.name`: `Rhitmo`
- `bot_user.display_name`: `Rhitmo`
- Default username: `rhitmo`

"Rhy" continua sendo o nome interno da persona/voz da IA (ver `mem://ai/constituicao-rhitmo-centralizada` e `src/lib/rhyVoice.ts`), mas não aparece como nome do app no Slack.
