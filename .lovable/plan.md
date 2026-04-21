

# Sprint 3 — Ondas 3B + 3C (execução)

## Status verificado

- ✅ Onda 3A funcional: 4 cron jobs ativos, runs com `status=success`, 6 prompts criados, 7 alertas HR, 2 weekly summaries
- ✅ 0 mirror insights (esperado — workspace de teste sem contradições)
- ✅ Linter Supabase: 6 warnings, todos pré-existentes (não introduzidos pela S3A)

Podemos seguir.

## Onda 3B — Conteúdo proativo

### S3.2 Mirror Insight Card
- `src/hooks/useMirrorInsight.ts` — busca insight ativo do líder logado (não dismissado, semana corrente)
- `src/components/dashboard/MirrorInsightCard.tsx` — card no topo do `Index.tsx` (acima do `SmartInbox`), só aparece se houver insight
- Sheet lateral com evidências (notas/transcrições citadas por ID, clicáveis), botão "Reconhecer" → `dismissed_at = now()`
- Visual: usa Brand Kit (Lora headline + ícone espelho), tom reflexivo não acusatório

### S3.3 Weekly Summary — Email + Slack
- Template `supabase/functions/_shared/transactional-email-templates/weekly-summary.tsx` (Lora/Inter, RhythmWave, suporta variantes líder/HR/reflexão)
- Registrar em `transactional-email-templates/registry.ts`
- Slack DM já dispara via `dispatchNotification` existente
- Atualizar `weekly-summary` edge function para passar dados estruturados (tópicos da semana, próximas reuniões, liderados estagnados)

### S3.4 Self-Reflection Card
- Card "Reflexão da semana" no `DirectReportDashboard.tsx` (acima do PulseCard)
- Hook `useWeeklyReflection.ts` busca prompt da semana corrente do membro
- Resposta opcional (textarea, max 500 chars) → grava em `member_prompts.response` + `answered_at`
- Se membro escolher compartilhar com líder → cria `feedbacks` com `source='self_reflection'`, `visibility='shared'`, `manager_id` do líder do time

### S3.5 HR Risk Alerts UI
- Badge no item "RH" do `AppSidebar.tsx` com count de alertas não lidos (de `leader_nudges` com `nudge_type='hr_risk_alert'` últimos 7d)
- Seção "Alertas automáticos" em `HRDashboard.tsx` listando os últimos alertas com link para o líder em risco
- Hook `useHRRiskAlerts.ts`

## Onda 3C — HR Intelligence Layer

### S3.6 Engagement Heatmap
- Migration: RPC `get_workspace_engagement_heatmap(_workspace_id)` retorna `{member_id, member_name, week_starting, activity_count, status}` para últimas 12 semanas
  - `status`: verde (≥3 atividades), amarelo (1-2), vermelho (0) — alinhado a `mem://features/team-management/health-status-logic`
  - Atividades = notas + 1:1s + reflexões respondidas
- `src/components/hr/EngagementHeatmap.tsx`: matriz CSS Grid (linhas=membros, 12 colunas=semanas), células coloridas com tooltip
- Inserir em `HRAnalytics.tsx` em nova seção "Engagement Heatmap"

### S3.7 PDF Export Mensal
- Edge function `generate-monthly-report` usando `@react-pdf/renderer` via `https://esm.sh/@react-pdf/renderer`
- Bucket privado `monthly-reports` + RLS por `workspace_id`
- Conteúdo do PDF: capa com Brand Kit (RhythmWave + Lora), Health Score, Heatmap snapshot, top 5 líderes ativos, alertas do mês, ações recomendadas
- Botão "Exportar PDF do mês" em `HRDashboard.tsx` (HR Admin only) + lista dos últimos 6 relatórios
- Síntese executiva por IA: `google/gemini-2.5-flash` (custo) — fallback `gemini-2.5-pro` se síntese mais profunda for pedida
- **Sem cron automático** nesta sprint (só on-demand). Cron mensal fica para Sprint 4.

## i18n

Novas chaves em PT-BR / EN / ES:
- `mirror.cardTitle`, `mirror.evidence`, `mirror.acknowledge`
- `weeklySummary.subject`, `weeklySummary.intro`, `weeklySummary.staleAlert`
- `selfReflection.cardTitle`, `selfReflection.shareWithLeader`, `selfReflection.placeholder`
- `hrAlerts.badgeTitle`, `hrAlerts.empty`, `hrAlerts.viewLeader`
- `heatmap.title`, `heatmap.legendActive`, `heatmap.legendLow`, `heatmap.legendInactive`
- `monthlyReport.button`, `monthlyReport.generating`, `monthlyReport.history`

## Ordem de execução

1. Hook + Card Mirror (S3.2)
2. Template email weekly-summary + atualizar edge fn (S3.3)
3. Self-reflection card no Direct Report Dashboard (S3.4)
4. Badge HR + seção alertas automáticos (S3.5)
5. RPC heatmap + componente (S3.6)
6. PDF export edge fn + bucket + UI (S3.7)
7. i18n PT/EN/ES completo
8. Typecheck + linter Supabase final

## Critérios de conclusão

- ✅ MirrorInsightCard renderiza quando há insight ativo, dismiss funciona
- ✅ Weekly summary entregue por email com template Lora/Inter + Slack DM
- ✅ Self-reflection card aparece no dashboard do liderado, resposta opcional grava em DB
- ✅ Badge HR mostra count + seção lista alertas automáticos
- ✅ Heatmap renderiza 12 semanas × N membros para HR Admin
- ✅ PDF mensal baixável, alinhado ao Brand Kit, salvo em bucket privado
- ✅ i18n completo nos 3 idiomas
- ✅ Linter Supabase sem novos warnings, typecheck limpo

## Observações técnicas

- **RLS:** RPC heatmap valida `has_role(auth.uid(), 'hr_admin')` ou `is_workspace_owner()`. Bucket `monthly-reports` com policy por workspace.
- **Custo IA:** Síntese executiva do PDF usa `gemini-2.5-flash` por padrão (memo `mem://monetization/modelo-economico-e-margens-abril-2026`).
- **Brand Kit:** PDF e email seguem RhythmWave + Lora headline + Inter body (memo `mem://design/rhythm-wave-dna`).
- **Anti-alucinação:** PDF cita números reais; nenhuma seção qualitativa sem evidência numérica.

