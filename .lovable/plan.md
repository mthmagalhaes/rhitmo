

## Cap de Reuniões com Bot + Atualização de Pricing

### Contexto
O bot de transcrição (Recall.ai) é o recurso mais caro da plataforma. Atualmente só existe cap de **horas de gravação** (`maxRecordingHours`), mas não há limite no **número de reuniões agendadas com bot**. Um power user no Business pode agendar 40+ reuniões/mês, estourando a margem. Precisamos adicionar um cap de reuniões com bot por plano.

### Caps propostos

| Plano | Reuniões com bot/mês | Gravação manual |
|-------|---------------------|-----------------|
| Pulse | 0 (sem acesso) | 0h |
| Pro | 20 | 12h |
| Business | 40 | 30h |

### Arquivos e mudanças

**1. `src/hooks/usePlanLimits.ts`**
- Adicionar `maxBotMeetings` à interface `PlanLimits` (Pulse: 0, Pro: 20, Business: 40)
- Adicionar query para contar `recall_bots` agendados no mês (`status != 'error'`)
- Expor `botMeetingCount`, `canScheduleBot`, `botMeetingsRemaining`

**2. `src/hooks/useCalendarIntegration.ts`**
- Importar `usePlanLimits` e verificar `canScheduleBot` antes de invocar `schedule-recall-bot`
- Mostrar toast de limite atingido se bloqueado

**3. `src/components/dashboard/UpcomingMeetingsCard.tsx`**
- Desabilitar botão de agendar bot quando `!canScheduleBot`
- Mostrar badge "X/Y reuniões" no card

**4. `supabase/functions/schedule-recall-bot/index.ts`**
- Adicionar verificação server-side: contar `recall_bots` do mês para o `user_id`, comparar com limite do plano via query ao `workspaces.plan_tier`
- Retornar 403 se exceder o cap

**5. `src/pages/Billing.tsx` — Atualizar features dos planos**
- Pulse: adicionar "Sem gravação com bot"
- Pro: adicionar "Até 20 reuniões com bot/mês"
- Business: adicionar "Até 40 reuniões com bot/mês"

**6. `src/pages/Landing.tsx` — Atualizar pricing em PT e EN**
- Pro PT: adicionar "Até 20 reuniões com bot de transcrição/mês"
- Business PT: adicionar "Até 40 reuniões com bot de transcrição/mês"
- Pro EN: "Up to 20 bot-transcribed meetings/mo"
- Business EN: "Up to 40 bot-transcribed meetings/mo"

**7. `src/components/billing/UpgradeBanner.tsx`**
- Adicionar check de `botMeetingCount` vs `maxBotMeetings` nos near-limits

**8. Memory — Atualizar `mem://monetization/plan-limits-and-guardrails-v2`**
- Documentar os novos caps de bot meetings

### Detalhes técnicos
- A contagem server-side no edge function usa: `SELECT count(*) FROM recall_bots WHERE user_id = $1 AND created_at >= $startOfMonth AND status != 'error'`
- O `plan_tier` é obtido via join `teams -> workspaces` usando o `user_id`
- Beta users (`is_beta_user = true`) continuam com Infinity em todos os limites

