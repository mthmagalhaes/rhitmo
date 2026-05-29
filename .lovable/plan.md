## Diagnóstico — o que já está em produção

Após verificação no banco e nos logs, as 3 fases originais **já estão funcionando**:

| Fase | Status | Evidência |
|---|---|---|
| 1 — Cron orquestrador | ✅ Ativo | `rhitmo-orchestrator-every-30min` (*/30), logs `[ORCHESTRATOR] Done in 153ms — briefs=0 err=0` (sem 401) |
| 2 — NL Member Resolution Slack | ✅ Wired | `resolveMemberFromQuestion` + `mode: 'member'` com feedbacks + `work_style_data` no `slack-bot/index.ts:265-355` |
| 3 — Slack no Diário | ✅ Renderizando | `FeedSection` faz `isSlackRollup ? SlackRollupFeedItem : DiaryFeedItem`, banco tem 36 rollups nos últimos 30d |

**Por que o líder não recebe DM proativa hoje:**
- 0 reuniões na janela 12h-36h (`upcoming_meetings` vazia nesse range)
- 0 pulses pendentes
- → orquestrador roda e corretamente não envia nada

Não é bug: é **falta de validação visível**. Ninguém confirma que o pipeline está vivo.

## Plano de validação + transparência

### 1. Smoke test ponta-a-ponta do orquestrador
- Criar endpoint de teste autenticado `POST /admin-test-orchestrator` (super-admin only) que:
  - Aceita `{ leaderUserId, dryRun }`
  - Chama internamente as mesmas funções `enqueueBriefDM` / `enqueuePulseDM`, mas força janela `now ± 24h`
  - Retorna JSON com quantos seriam enviados, evidência (member_name, channel, payload preview)
- Servir como o "ping" oficial para validar pipeline sem precisar de reunião real agendada

### 2. Painel "Saúde do Slack" em `/lider/configuracoes` (card existente)
Adicionar bloco read-only com:
- Última execução do orquestrador (timestamp + status)
- Próximas 1:1s na janela (count + lista compacta)
- Última DM proativa enviada para mim (tipo + timestamp)
- Última atividade ambient classificada (count últimos 7d)
- Botão "Enviar brief de teste agora" → chama endpoint da etapa 1

Hook: nova RPC `get_slack_orchestrator_health(user_id)` retornando esses agregados.

### 3. Validar Fase 2 (NL Resolution) com teste manual guiado
- Garantir que `resolveMemberFromQuestion` está logando claramente cada caminho (já tem `[DM-MENTOR] member_resolved:` na linha 293)
- Adicionar log explícito quando NENHUM membro resolve: `[DM-MENTOR] member_NOT_resolved` com a question
- Permite que o usuário (matheus@fstr.co) mande DM "como dar feedback para Gabriela?" e nós conferimos via `edge_function_logs` em qual branch caiu

### 4. Validar Fase 3 (Diário) visualmente
- Confirmar que `/lider/diario` renderiza os 36 rollups existentes mesclados com feedbacks
- Adicionar badge sutil "via Slack" no `SlackRollupFeedItem` para diferenciar de notas manuais (se ainda não tiver)

## Arquivos a alterar

- `supabase/functions/admin-test-orchestrator/index.ts` (novo) — endpoint de teste
- `supabase/functions/slack-rhitmo-orchestrator/index.ts` — extrair `enqueueBriefDM` reutilizável
- `supabase/migrations/<timestamp>_slack_orchestrator_health.sql` — RPC `get_slack_orchestrator_health`
- `src/pages/lider/Configuracoes.tsx` (ou componente do card Slack) — bloco "Saúde do Slack" + botão teste
- `supabase/functions/slack-bot/index.ts` — log de `member_NOT_resolved`
- `src/components/leader/diario/SlackRollupFeedItem.tsx` — badge "via Slack" (se faltar)

## Fora de escopo (próximos sprints)
- Bloco "Atividade no Slack" injetado no brief de 1:1 (já mapeado, sprint separada)
- Card agregado "Pulso semanal do time no Slack" na home
- UI de transparência pro liderado (opt-out de canais)
