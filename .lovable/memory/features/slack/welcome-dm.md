---
name: Slack Welcome DM
description: DM proativa enviada via slack-link após primeiro vínculo OAuth, com tour de comandos filtrado por audiência (líder/liderado) e botão start_rhitmo_chat
type: feature
---

# Slack Welcome DM (Sprint pós-onboarding)

## Trigger
Edge function `supabase/functions/slack-link/index.ts`, logo após o `upsert` em `slack_integrations` ser bem-sucedido. Disparado via `EdgeRuntime.waitUntil` (não bloqueia a resposta para o frontend `/slack/connect`).

## Idempotência
Coluna `slack_integrations.welcome_dm_sent_at TIMESTAMPTZ`:
- Antes de enviar, lê a coluna; se já preenchida, faz `return` silencioso
- Após `chat.postMessage` com `data.ok === true`, faz `UPDATE ... SET welcome_dm_sent_at = now()`
- Se a chamada Slack falhar, NÃO marca — permite retry no próximo reconnect

## Audiência
Função `detectAudience(serviceClient, userId)`:
- `'leader'` se: `workspaces.owner_id = userId AND is_active=true` OU `teams.leader_user_id = userId`
- caso contrário: `'member'`
- Precedência líder > liderado (líder vê todos os comandos relevantes a ele)

Filtragem de comandos via `commandsForAudience()` em `supabase/functions/_shared/slackCommands.ts`.

## Conteúdo da DM (Block Kit)
1. `section` — saudação personalizada (`Olá, {firstName} 👋`, nome via `serviceClient.auth.admin.getUserById`)
2. `section` — lista de comandos formatados como `\`/cmd\` — descrição`
3. `actions` — botão `🌀 Conversar com a Rhitmo` (`action_id: 'start_rhitmo_chat'`, primary) — reaproveita handler existente em `slack-bot` que cria `slack_conversations` com `intent: 'general_chat'`
4. `context` — dica de privacidade ("Conversas aqui são privadas; em canais públicos só processo menções")

## Fontes de verdade que precisam ficar sincronizadas
- `src/lib/slackCommands.ts` (UI)
- `supabase/functions/_shared/slackCommands.ts` (edge — espelho)
- `supabase/functions/slack-bot/index.ts` (case branches dos comandos)
- `docs/slack-app-manifest.md` (manifest Slack)

## Não-objetivos
- Não substitui o fluxo de `pending_slack_invites` (DMs de convite para liderados ainda inexistentes na plataforma)
- Não envia welcome em reconexões (idempotente por design)
- Não toca em `slack-oauth-callback` — DM dispara em `slack-link`, que é onde o vínculo acontece
