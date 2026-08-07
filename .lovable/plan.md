# Diagnóstico: bot do Rhitmo não entra nas reuniões + acessos

Investigação read-only concluída. Três problemas independentes, com causas confirmadas por dados.

## 1. Nenhum bot é criado desde 15/07 (crítico)

Fatos verificados no banco:
- Última linha em `recall_bots` é de **15/07/2026**. De lá para cá, zero bots — inclusive para reuniões que estão sincronizadas com liderado vinculado e link do Meet (ex.: "Renner <> Faster", hoje 18:00 UTC, do matheus.magalhaes@fstr.co).
- As duas últimas tentativas registradas falharam com `Bot falhou: insufficient_credit_balance` (Recall.ai).
- Em `fetch-calendar-events`, quando a API do Recall responde erro, o código apenas loga: **não grava linha em `recall_bots`**. Por isso o sintoma é "o bot simplesmente não aparece", sem nenhum rastro na UI.
- **Não existe cron para `fetch-calendar-events`.** A lista de `cron.job` não tem essa entrada. A sincronização (e portanto o agendamento automático) só roda quando o líder abre o app — os `last_synced` batem exatamente com os horários de refresh do token de cada usuário.

Causa raiz: saldo/plano da conta Recall.ai esgotado, combinado com falha silenciosa e ausência de agendador.

Correções propostas:
1. Verificar billing da conta Recall.ai (ação fora do código; sem crédito nada mais funciona).
2. Em `fetch-calendar-events` e `schedule-recall-bot`: ao falhar a criação do bot, gravar `recall_bots` com `status='error'` e `error_message` com o texto retornado pelo Recall, para o card "Próximas 1:1s" mostrar o motivo.
3. Criar cron `fetch-calendar-events-every-15min` que sincroniza os usuários com `auto_transcribe = true`, para não depender de o líder abrir o app.

## 2. "Faça upgrade do plano" para o Douglas (alto)

`schedule-recall-bot` resolve o plano assim: primeiro procura `workspaces.owner_id = usuário`; só se **não** encontrar nenhum é que olha o workspace onde ele é líder.

- Douglas é dono de "Workspace de Douglas (legado)" (`pulse`, `is_beta_user=false`) e líder de time no "Faster" (`enterprise`, beta). O lookup para no workspace legado → cap 0 → erro de upgrade.
- Mesma armadilha vale para tharyane.figueiredo@fstr.co, dona de "Faster (legado)".
- `BOT_CAPS` também não tem a chave `enterprise` — o Faster só passa hoje porque `is_beta_user = true`. Qualquer cliente enterprise não-beta seria bloqueado.

Correção proposta em `schedule-recall-bot`: considerar **todos** os workspaces do usuário (posse + liderança) e usar o melhor tier/beta encontrado; adicionar `enterprise: Infinity` ao `BOT_CAPS`.

## 3. Bot removido por "líder não detectado" (médio)

Quatro reuniões do vitor@fstr.co terminaram em `skipped_no_leader` — o bot entrou e foi removido por não identificar o líder. Vale revisar a janela/critério de detecção (hoje `check-pending-leader-presence` a cada 5 min), mas isso é secundário ao item 1.

## 4. Acesso "somente leitura" do Guto (não reproduzido)

`get_account_context` retorna para guto.biazzi@fstr.co: `role = hr_admin`, workspace Faster, `is_workspace_owner = false`. A tela de configurações libera edição para HR Admin **ou** dono, então o bloqueio não está nessa regra. Preciso saber qual aba e qual botão exatos apareceram desabilitados para confirmar se é RLS na tabela alvo.

## Detalhes técnicos

- Arquivos a alterar: `supabase/functions/schedule-recall-bot/index.ts` (resolução de plano + `BOT_CAPS` + persistir erro), `supabase/functions/fetch-calendar-events/index.ts` (persistir erro do Recall).
- Migração: `cron.schedule` para o sync de calendário.
- Tickets de suporte: o RPC `support_ticket_open` exige sessão de super admin e falha quando executado pela ferramenta administrativa; os três tickets seriam inseridos direto em `support_tickets` (TKT do mês corrente) com status `diagnosed`.

Nada foi alterado ainda.
