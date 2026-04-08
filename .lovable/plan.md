

## Status dos Guardrails por Plano — Diagnóstico Completo

### O que JA funciona (automatizado)

| Guardrail | Onde é checado | Status |
|-----------|---------------|--------|
| Limite de membros | `NewMemberDialog` + botão Index desabilitado | OK |
| Limite de times | `NewTeamDialog` | OK |
| Limite de reviews/mês | `CreateFormalReviewDialog` + `NewReviewDialog` | OK |
| Analytics bloqueado (Pulse) | `Analytics.tsx` — tela de upsell | OK |
| Rhitmo Sync bloqueado (Pulse) | `MemberDetails` — blur + `NewMemberDialog` — checkbox desabilitado | OK |
| Banner de proximidade do limite | `UpgradeBanner` — aviso 80%, bloqueio 100% | OK |
| Beta users bypass tudo | `usePlanLimits` — `is_beta_user = true` | OK |
| Checkout Pro (14d trial) | `create-checkout-session` | OK |
| Checkout Business (mín. 3 líderes) | Dialog de quantidade + validação no edge function | OK |
| Upgrade/Downgrade in-place | `update-subscription` | OK |
| Cancelamento + reativação | `cancel-subscription` + `reactivate-subscription` | OK |
| Faturas | `get-invoices` | OK |

### O que NAO funciona (gaps)

| # | Gap | Risco | Correção |
|---|-----|-------|----------|
| 1 | **Mentor Chat sem limite de mensagens (Pulse = 20/mês)** | Usuário Pulse pode mandar mensagens ilimitadas. `MentorChat.tsx` nunca checa `maxMentorMessages`. | Contar mensagens do mês no hook, bloquear envio no Pulse após 20. |
| 2 | **Gravação de reuniões sem limite de horas** | `maxRecordingHours` definido (0/12/30) mas nunca checado. Pulse não deveria gravar. Pro deveria parar após 12h. | Contar horas usadas no mês, bloquear upload/gravação. |
| 3 | **HR Dashboard sem gate de acesso** | Páginas HR (Dashboard, Analytics, Members, Teams) checam `useHRAdmin()` (role), mas não checam `hasHrDashboard` (plano). Um Pro com role HR admin acessaria. | Adicionar check `hasHrDashboard` nas 4 páginas HR. |
| 4 | **Stripe webhook não atualiza `plan_tier` no workspace** | O `stripe-webhook` atualiza a tabela `subscriptions`, mas precisa verificar se também atualiza `workspaces.plan_tier`. Se não, o app pode ficar dessincronizado. | Verificar e corrigir o webhook. |

### Plano de correção

**1. Mentor Chat — limite de 20 msg/mês para Pulse**
- Em `MentorChat.tsx`: contar mensagens do mês com query `count` filtrada por `role = 'user'` e `created_at >= primeiro dia do mês`
- Se `count >= maxMentorMessages`: desabilitar input + mostrar mensagem de upgrade
- Adicionar `mentorMessagesUsed` e `canSendMentorMessage` ao `usePlanLimits`

**2. Gravação de reuniões — limite de horas**
- Criar query para somar `duration_seconds` de `meeting_transcripts` no mês
- Se Pulse (`maxRecordingHours = 0`): esconder/desabilitar botão de gravação
- Se Pro/Business: bloquear ao atingir 12h/30h
- Checar em `MeetingRecorder.tsx` e no edge function `upload-meeting`

**3. HR Dashboard — gate de plano**
- Nas 4 páginas HR (`HRDashboard`, `HRAnalytics`, `HRMembers`, `HRTeams`): adicionar check `hasHrDashboard`
- Se `false`: redirecionar para upsell ou mostrar tela bloqueada

**4. Verificar webhook sincroniza plan_tier**
- Ler `stripe-webhook/index.ts` para confirmar que atualiza `workspaces.plan_tier`
- Se não atualiza: adicionar update

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/hooks/usePlanLimits.ts` | Adicionar queries de mentor messages e recording hours |
| `src/components/MentorChat.tsx` | Checar limite antes de enviar |
| `src/components/MeetingRecorder.tsx` | Checar limite de horas |
| `src/pages/HRDashboard.tsx` | Adicionar gate `hasHrDashboard` |
| `src/pages/HRAnalytics.tsx` | Adicionar gate `hasHrDashboard` |
| `src/pages/HRMembers.tsx` | Adicionar gate `hasHrDashboard` |
| `src/pages/HRTeams.tsx` | Adicionar gate `hasHrDashboard` |
| `supabase/functions/stripe-webhook/index.ts` | Verificar/corrigir sync de `plan_tier` |
| `supabase/functions/upload-meeting/index.ts` | Adicionar validação server-side de horas |

### Resumo

O app está **~70% pronto** para receber clientes pagos. Os limites de membros, times e reviews funcionam bem. Faltam 4 correções para fechar os gaps — sendo as mais críticas o Mentor Chat sem limite e a gravação sem controle de horas, pois são custos diretos (API de AI e storage/transcrição).

