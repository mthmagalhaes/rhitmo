

# Sprint 3 — Execução (plano revisado pós-inspeção)

## Ajustes vs plano original

1. **`pg_cron` + `pg_net` já habilitados** (4 jobs ativos). Pulo o `CREATE EXTENSION` e só adiciono os 4 novos jobs.
2. **`_shared/notifications.ts` não existe** — assumi que tinha sido criado em S2.3 mas não foi. Vou criar como parte da onda 3A (helper compartilhado: enfileira email via `enqueue_email`, posta no Slack via `slack-bot`, ou cria nudge in-app conforme `user_notification_preferences`).
3. **Tabelas existentes confirmadas:** `user_notification_preferences`, `leader_nudges`, `meeting_transcripts`, `goals`, `team_members`, `workspaces`, `user_roles`. Posso referenciá-las direto.

## Onda 3A — Infra de automação

**1. Solicitar `CRON_SECRET`** via `add_secret` (bloqueio até o usuário colar).

**2. Migração schema:**
- `automation_runs` (id, job_name, started_at, finished_at, status, items_processed, error)
- `mirror_insights` (id, manager_id, week_starting, summary, contradiction_score, evidence jsonb, dismissed_at, created_at) + RLS estrita por `manager_id` via `effective_user_id()`
- `member_prompts` (id, member_id, prompt_text, week_starting, answered_at, response, created_at) + RLS pelo próprio member
- Índices: `mirror_insights(manager_id, week_starting desc)`, `member_prompts(member_id, week_starting desc)`

**3. Helpers em `_shared/`:**
- `cronAuth.ts` — valida header `x-cron-secret`
- `notifications.ts` — função `dispatchNotification({ userId, channel: 'email'|'slack'|'in_app', payload })` que respeita `user_notification_preferences`
- `automationRun.ts` — wrapper start/finish em `automation_runs`

**4. Edge functions (4):**
- `mirror-weekly` (S3.2)
- `weekly-summary` (S3.3)
- `self-reflection` (S3.4)
- `hr-risk-alerts` (S3.5)

Cada uma: importa `cronAuth`, `rhitmo-constitution`, `automationRun`. Usa `google/gemini-2.5-flash` quando precisar de IA.

**5. Cron jobs** (via insert tool, não migração — contém URL/key):
```text
mirror-weekly       → 0 6  * * 1   (seg 6h UTC)
self-reflection     → 0 12 * * 1   (seg 12h UTC = 9h BRT)
weekly-summary      → 0 20 * * 5   (sex 20h UTC = 17h BRT)
hr-risk-alerts      → 0 11 * * *   (diário 11h UTC = 8h BRT)
```

## Onda 3B — Conteúdo proativo (após 3A funcional)

**S3.2 Mirror — Frontend:**
- Componente `src/components/dashboard/MirrorInsightCard.tsx` no topo do `Index.tsx` (acima do `SmartInbox`) quando há insight ativo
- Sheet com evidências (notas citadas por ID), botão "Reconhecer" → `dismissed_at`
- Hook `useMirrorInsight()`

**S3.3 Weekly Summary — Email + Slack:**
- Template `weekly-summary.tsx` em `_shared/transactional-email-templates/` (Lora/Inter)
- Registrar em `transactional-email-templates/registry.ts`
- Slack: DM via `slack-bot`

**S3.4 Self-Reflection:**
- 8 prompts curados (PT-BR, EN, ES) em `supabase/functions/self-reflection/prompts.ts`
- Card "Reflexão da semana" em `DirectReportDashboard.tsx`
- Resposta opcional vira nota privada do líder com `source='self_reflection'`

**S3.5 HR Risk Alerts:**
- Reusa RPC `get_leaders_at_risk` existente
- Dedupe via `metadata->>'week_starting'` em `leader_nudges`
- Badge no menu HR + seção "Alertas automáticos" em `HRDashboard.tsx`

## Onda 3C — HR Intelligence Layer

**S3.6 Heatmap:**
- RPC `get_workspace_engagement_heatmap(_workspace_id)` retorna matriz time × 12 semanas
- Componente `src/components/hr/EngagementHeatmap.tsx` (matriz CSS, cores verde/amarelo/vermelho via `mem://features/team-management/health-status-logic`)
- Posicionado em `HRAnalytics.tsx`

**S3.7 PDF Export:**
- `bun add @react-pdf/renderer` (rodando no edge runtime via esm.sh)
- Edge function `generate-monthly-report`
- Bucket privado `monthly-reports` + RLS por workspace
- Botão "Exportar PDF do mês" em `/hr` (HR Admin only) + lista de relatórios anteriores
- **Sem cron automático nesta sprint** (só on-demand) para reduzir risco; cron mensal fica para sprint 4

## i18n

Novas chaves em PT-BR / EN / ES:
`mirror.*`, `weeklySummary.*`, `selfReflection.*`, `hrAlerts.*`, `heatmap.*`, `monthlyReport.*`, `automationRuns.*`

## Critérios de conclusão

- ✅ 4 jobs cron novos visíveis em `cron.job` e logados em `automation_runs`
- ✅ Mirror insight gerado em workspace de teste
- ✅ Weekly summary entregue via email + slack respeitando preferências
- ✅ Self-reflection prompt aparece no dashboard do liderado
- ✅ Heatmap renderiza para HR Admin
- ✅ PDF mensal baixável e alinhado ao Brand Kit
- ✅ Linter Supabase sem novos warnings críticos
- ✅ Typecheck limpo

## Observações técnicas críticas

- **Custo IA:** Mirror + Weekly Summary usam `google/gemini-2.5-flash` (memo `mem://monetization/modelo-economico-e-margens-abril-2026`). PDF pode usar `gemini-2.5-pro` se síntese executiva exigir.
- **Anti-alucinação:** Mirror cita IDs de transcrições/notas como evidência, nunca generaliza.
- **RLS:** todas tabelas novas com policies via `effective_user_id()` para respeitar impersonation.
- **Constituição Rhitmo:** importada em todas funções com IA.

## Ordem de execução imediata

1. `add_secret` `CRON_SECRET` (bloqueio)
2. Migração 3A (tabelas + RLS)
3. Helpers `_shared/` (cronAuth, notifications, automationRun)
4. Edge functions 4x + deploy
5. Cron jobs (insert SQL com URL/key)
6. Frontend Mirror (S3.2)
7. Templates email + Slack (S3.3)
8. Self-reflection card (S3.4)
9. HR badge + seção alertas (S3.5)
10. RPC heatmap + componente (S3.6)
11. PDF export (S3.7)
12. i18n completo + typecheck + linter Supabase

