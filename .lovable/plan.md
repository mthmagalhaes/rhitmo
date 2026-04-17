

# P1 — Refinamentos do Command Center

Dois itens do P1 propostos. Vou planejar ambos juntos pois compartilham o mesmo arquivo (`AdminOverview.tsx`).

## Item 1 — Refatorar `AdminOverview.tsx`

Hoje o arquivo tem ~380 linhas misturando: stats, alerts, recent activity, waitlist + dialog de convite. Vamos extrair em componentes próprios, mantendo `AdminOverview` como orquestrador enxuto.

**Quebra:**

- `src/components/admin/StatsGrid.tsx` — 6 big numbers (Workspaces, Usuários, Feedbacks, Reviews, Assinaturas, Leads). Recebe stats + paidCount + leadsCount via props ou faz queries próprias.
- `src/components/admin/InactiveWorkspacesAlert.tsx` — card amber com contagem de workspaces sem atividade 30d.
- `src/components/admin/RecentActivityCard.tsx` — últimos 5 feedbacks. Query própria.
- `src/components/admin/WaitlistTable.tsx` — tabela completa de leads + dialog de convite + lógica de `admin-invite-user`. Encapsula estado `invitingEmail` e `inviteDialog`.

**`AdminOverview.tsx` final** vira ~40 linhas:
```tsx
<div className="p-8 space-y-8">
  <Header />
  <FunnelCard />
  <ActivationCohorts />
  <StatsGrid />
  <InactiveWorkspacesAlert />
  <RecentActivityCard />
  <WaitlistTable />
</div>
```

Zero mudança visual ou funcional. Apenas organização.

## Item 2 — Drill-down nas coortes

Tornar cada linha da tabela `ActivationCohorts` clicável → abre `<Sheet>` lateral com a lista de workspaces daquela coorte, com status individual de ativação.

**Backend:**
- Nova RPC `admin_cohort_workspaces(p_cohort_month text)` retornando: `workspace_id`, `workspace_name`, `created_at`, `owner_email`, `first_activation_at` (min entre feedback/review/transcript), `activation_bucket` (`d1` | `d7` | `d30` | `not_activated`), `feedbacks_count`, `reviews_count`, `transcripts_count`. `SECURITY DEFINER` + `is_admin()` guard.

**Frontend:**
- `src/components/admin/CohortDrilldownSheet.tsx` — Sheet lateral (right side, `sm:max-w-2xl`):
  - Header: "Coorte de Nov/25 · 12 workspaces"
  - Tabela: Workspace · Owner · Criado em · Status (badge colorido por bucket) · Ativações (contadores)
  - Ordenação default: não-ativados primeiro (acionáveis no topo)
  - Loading skeleton
- `ActivationCohorts.tsx` — adicionar `onClick` em cada `<tr>` + estilo `cursor-pointer hover:bg-muted/50`. Estado local `selectedCohort: string | null` controla abertura do Sheet.

**Decisões:**
- Sheet em vez de Dialog — preserva contexto da tabela atrás.
- Não-ativados ordenados primeiro — mais útil para ação ("quem precisa de empurrão?").
- Buckets exclusivos no drill-down (D1, D7-not-D1, D30-not-D7, not_activated) para identificar rapidamente onde cada workspace travou.

## Arquivos

**Item 1 (refactor):**
- `src/components/admin/StatsGrid.tsx` (novo)
- `src/components/admin/InactiveWorkspacesAlert.tsx` (novo)
- `src/components/admin/RecentActivityCard.tsx` (novo)
- `src/components/admin/WaitlistTable.tsx` (novo)
- `src/components/admin/AdminOverview.tsx` (enxugar para orquestrador)

**Item 2 (drill-down):**
- Migration: RPC `admin_cohort_workspaces`
- `src/components/admin/CohortDrilldownSheet.tsx` (novo)
- `src/components/admin/ActivationCohorts.tsx` (adicionar click + state)

Zero impacto em RLS, rotas, ou outras telas.

