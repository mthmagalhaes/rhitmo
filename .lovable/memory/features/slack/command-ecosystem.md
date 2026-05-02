---
name: Slack Command Ecosystem
description: Lista canônica dos 7 slash commands do Rhitmo bot e onde mantê-los sincronizados
type: feature
---

**Single source of truth:** `src/lib/slackCommands.ts` exporta `SLACK_COMMANDS` (7 itens). Toda UI que lista comandos (`SlackConnectorDialog`, `SlackPrivacyOnboarding`, `HelpCenter` integrations + featureCards) consome dali. As strings i18n `slackDescription` em `pt-BR/en/es.json` listam os 7 comandos completos.

**Comandos implementados (em `supabase/functions/slack-bot/index.ts`):**
- `/rhitmo` — menu (linha ~1225)
- `/nota` — observação privada sobre liderado (linha ~1234)
- `/kudos` — reconhecimento público (linha ~1241)
- `/brief` — resumo pré-1:1 (linha ~1266)
- `/meu-pdi` — PDI do liderado (linha ~1273)
- `/mentor` — chat IA (linha ~1278)
- `/meu-rhitmo` — resumo executivo do liderado (linha ~1285)

**Removido:** `/review` foi listado erroneamente em `SlackPrivacyOnboarding` mas nunca existiu no bot. Performance Reviews são fluxo web/sheet, não Slack.

**Manifesto Slack reproduzível:** `docs/slack-app-manifest.md` tem o JSON pronto para colar em `api.slack.com/apps`. Se adicionar/remover comando, atualizar nos 3 lugares: `slackCommands.ts`, `slack-bot/index.ts` e `docs/slack-app-manifest.md`.

**Scopes do bot (auditados via auth.test 2026-05-02):** commands, chat:write, chat:write.public, users:read, users:read.email, im:history, im:write, im:read, channels:join, channels:read, channels:history, groups:read, groups:history, app_mentions:read. Cobre 100% do código atual.

**Gaps conhecidos (não bloqueantes):** `app_mention` está inscrito mas sem handler; `/kudos` em canal privado pode falhar (sem `groups:write` + bot precisa ser convidado); `/pulse` ainda não existe (Pulse hoje só via DM proativa do orchestrator).
