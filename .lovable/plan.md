

# Sprint 3 — Finalização

Estado atual após inspeção: a maior parte do código já está em produção, mas há gaps que impedem a sprint de ser "fechada".

## O que está pronto ✅

- `MirrorInsightCard` integrado em `Index.tsx` (linha 605)
- `SelfReflectionCard` integrado no `DirectReportDashboard` (linha 486)
- `HRAutoAlertsSection` e `MonthlyReportButton` integrados no `HRDashboard.tsx`
- `EngagementHeatmap` já existia (usa RPC `get_hr_analytics_advanced`) — não precisa novo RPC
- 4 cron jobs ativos, edge functions deployadas, executadas com sucesso

## O que falta ❌

### 1. i18n (bloqueio crítico)

Os componentes usam `t('mirror.cardTitle')`, `t('selfReflection.placeholder')`, etc., mas **nenhuma chave nova foi adicionada** em `pt-BR.json`, `en.json`, `es.json`. Hoje a UI renderiza as próprias keys como texto. Adicionar nos 3 idiomas:

- `mirror.*` — cardTitle, scoreLabel, recommendation, viewEvidence, acknowledge, sheetTitle, declared, observed, evidence
- `selfReflection.*` — cardTitle, placeholder, shareWithLeader, submit, noResponse, sharedConfirmed, privateConfirmed, privacyNote
- `hrAlerts.*` — sectionTitle, badgeTitle, empty, viewLeader, severity (high/medium/low)
- `monthlyReport.*` — button, generating, history, downloadLast, success
- `weeklySummary.*` — usado só em template de email (já com texto inline em PT), sem necessidade no front

### 2. Badge de alertas no AppSidebar (S3.5)

Adicionar contagem de alertas HR não lidos (últimos 7 dias) no item "Visão geral" do menu HR. Reutilizar `useHRRiskAlerts` — somar `total_unread` e renderizar pequeno badge `bg-destructive` ao lado do label quando > 0.

### 3. Validação final

- Rodar Supabase linter (confirmar 0 novos warnings em cima dos 6 pré-existentes)
- Smoke test manual via `curl_edge_functions`:
  - `weekly-summary` (uma execução)
  - `mirror-weekly` (uma execução)
- Verificar `automation_runs` mais recente para garantir `status=success`

### 4. Observação registrada (não bloqueia)

O `weekly-summary` edge fn entrega `notesCount`, `meetingsCount`, `membersCount`, `staleCount` — alinhado ao template atual. Os campos opcionais "tópicos da semana" e "próximas reuniões" mencionados no plano original ficam para Sprint 4 (precisam de classificação de notas + leitura de calendar events agregados).

## Ordem de execução

1. Adicionar chaves i18n PT/EN/ES nos 3 JSONs
2. Adicionar badge HR no `AppSidebar.tsx` (usando `useHRRiskAlerts`)
3. Rodar Supabase linter
4. Smoke test `weekly-summary` + `mirror-weekly` via curl
5. Confirmar runs com `status=success`

## Critérios de conclusão

- ✅ UI sem chaves cruas (`mirror.cardTitle` etc.) em nenhum dos 3 idiomas
- ✅ Badge de alerta HR renderiza no sidebar quando há alertas não lidos
- ✅ Linter Supabase sem warnings novos
- ✅ Última execução manual de cada edge function = `success`

## Observações técnicas

- Reutilizar o hook `useHRRiskAlerts` já existente no badge — sem nova query
- Chaves de email do `weekly-summary` já estão hardcoded em PT no template; manter assim por enquanto (templates de email seguem padrão atual da plataforma)
- Sem mudanças de schema, sem novas migrations

