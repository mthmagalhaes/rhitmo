# DM de Boas-vindas após conectar Slack

Hoje, quando o líder (ou liderado) completa o OAuth do Slack, a conta é vinculada em silêncio — nenhuma mensagem é enviada. O usuário precisa lembrar de digitar `/rhitmo` por conta própria. Vamos resolver isso com uma DM proativa do bot Rhitmo logo após o vínculo.

## O que o usuário verá

Logo após o redirect de sucesso em `/slack/connect`, recebe uma DM do bot Rhitmo no Slack com:

1. **Saudação personalizada** ("Olá, Matheus 👋 Sua conta Rhitmo está conectada.")
2. **Mini tour dos comandos** — filtrado pela audiência do usuário:
   - **Líder** vê: `/rhitmo`, `/nota`, `/kudos`, `/brief`, `/mentor`
   - **Liderado** vê: `/rhitmo`, `/meu-pdi`, `/meu-rhitmo`
   - (audiência detectada via lookup em `team_members.linked_user_id` vs `workspaces.owner_id`)
3. **Botão "🌀 Conversar com a Rhitmo"** (action_id `start_rhitmo_chat`, já existente no `slack-bot`) — abre uma `general_chat` session
4. **Dica de privacidade** ("Suas conversas comigo aqui são privadas. Em canais públicos, eu só processo mensagens onde sou mencionado.")

## Idempotência

Se o usuário desconectar e reconectar (ou se o callback rodar duas vezes), **não enviamos a DM novamente**. Controle via coluna `welcome_dm_sent_at` em `slack_integrations`.

## Mudanças técnicas

### 1. Migration — adicionar coluna de controle
```sql
ALTER TABLE public.slack_integrations
  ADD COLUMN IF NOT EXISTS welcome_dm_sent_at TIMESTAMPTZ;
```

### 2. `supabase/functions/slack-link/index.ts`
Após o `upsert` bem-sucedido em `slack_integrations`:
- Reler a linha para checar `welcome_dm_sent_at`
- Se `null`: chamar `sendWelcomeDM(user.id, slack_user_id, slack_team_id)` via `EdgeRuntime.waitUntil` (não bloqueia a resposta para o frontend)
- Após sucesso do `chat.postMessage`, dar `UPDATE slack_integrations SET welcome_dm_sent_at = now()` (service role)

### 3. Nova função utilitária `sendWelcomeDM` (inline em `slack-link/index.ts`)
- Buscar `bot_token` do workspace (mesma fonte que `slack-bot` usa — provavelmente `slack_workspaces.bot_token` ou env `SLACK_BOT_TOKEN`)
- Detectar audiência:
  - Se `user_id` é `owner_id` de algum workspace ativo OU tem `team_members` onde é `leader_user_id` → `'leader'`
  - Caso contrário (linked_user_id em algum team_member) → `'member'`
- Importar `SLACK_COMMANDS` (não dá — edge function não importa de `src/`). **Solução:** criar `supabase/functions/_shared/slackCommands.ts` espelhando `src/lib/slackCommands.ts` (anotado na memória como par a sincronizar)
- Filtrar comandos por audiência (`audience === 'leader' | 'all'` ou `member | all`)
- Montar Block Kit: `section` com saudação + `section` com lista de comandos (formato `code` + descrição) + `actions` com botão `start_rhitmo_chat` + `context` com dica de privacidade
- POST `https://slack.com/api/chat.postMessage` com `channel: slack_user_id` (Slack abre o IM automaticamente)

### 4. Atualizar memória
- Atualizar `mem://features/slack/command-ecosystem` adicionando que `_shared/slackCommands.ts` precisa ficar sincronizado com `src/lib/slackCommands.ts` e `slack-bot/index.ts`
- Criar `mem://features/slack/welcome-dm` documentando trigger, idempotência (`welcome_dm_sent_at`) e filtro por audiência

## Não-objetivos

- **Não** vamos enviar DM em invites de novos liderados (já coberto pelo fluxo de `pending_slack_invites`)
- **Não** vamos criar uma nova action no Slack — reaproveitamos `start_rhitmo_chat` que já existe
- **Não** vamos tocar no `slack-oauth-callback` (a DM dispara em `slack-link`, que é onde o vínculo de fato acontece)

## Arquivos afetados

- **Migration nova** — adicionar `welcome_dm_sent_at`
- `supabase/functions/slack-link/index.ts` — disparar DM pós-upsert
- `supabase/functions/_shared/slackCommands.ts` — **novo**, espelho de `src/lib/slackCommands.ts`
- `.lovable/memory/features/slack/command-ecosystem.md` — atualizar regra de sync
- `.lovable/memory/features/slack/welcome-dm.md` — **novo**

## Riscos e mitigações

- **Bot token ausente** → log de warning e seguir, sem quebrar o vínculo
- **DM falha** (`chat.postMessage` retorna `ok:false`) → logar erro, não setar `welcome_dm_sent_at`, vínculo continua válido
- **Detecção de audiência ambígua** (usuário é líder e liderado ao mesmo tempo) → precedência líder (mostra comandos completos)

Aprova para eu implementar?
