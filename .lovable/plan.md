
# Entrega 3 — Activation Cohorts (Command Center)

Última entrega do P0. Adicionar análise de coortes de ativação no Command Center, para responder: **"workspaces que entram esse mês ativam mais rápido que os do mês passado?"**

## O que entrega

Bloco `<ActivationCohorts />` abaixo do `<FunnelCard />` em `AdminOverview.tsx` com:

1. **Tabela de coortes mensais** — últimos 6 meses, com:
   - Mês de criação do workspace (ex: "Nov/25")
   - Total de workspaces criados naquele mês
   - % ativados em D1 / D7 / D30 (≥1 feedback, review ou transcript)
2. **Heatmap visual** — células coloridas por % ativação (verde >60%, amarelo 30-60%, vermelho <30%)
3. **Insight automático** — comparação cohort atual vs anterior (ex: "Coorte de Nov ativando 23% mais rápido que Out")

## Implementação técnica

### Migration: nova RPC `admin_activation_cohorts()`

```sql
CREATE FUNCTION admin_activation_cohorts() RETURNS jsonb
SECURITY DEFINER ... AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  -- Para cada um dos últimos 6 meses:
  --   1. Listar workspaces criados naquele mês (cohort_month)
  --   2. Para cada workspace, calcular primeiro evento de ativação
  --      (min de feedbacks.created_at, performance_reviews.created_at, meeting_transcripts.created_at)
  --   3. Classificar como ativado em D1 (≤24h), D7 (≤7d), D30 (≤30d)
  --   4. Retornar contagens + percentuais
  
  RETURN jsonb_build_object(
    'cohorts', jsonb_agg(...),
    'insight', 'Coorte de Nov ativando 23% mais rápido que Out (D7)'
  );
END $$;
```

### Componente `src/components/admin/ActivationCohorts.tsx`

Card único Bento `rounded-2xl` com tabela de coortes:

```
┌────────────────────────────────────────────────┐
│ Coortes de Ativação                            │
│ 💡 Coorte de Nov ativando 23% mais rápido      │
├──────────┬──────┬────────┬────────┬────────┤
│ Coorte   │ Total│ D1     │ D7     │ D30    │
├──────────┼──────┼────────┼────────┼────────┤
│ Nov/25   │  12  │ 🟢 33% │ 🟢 67% │ 🟢 83% │
│ Out/25   │  18  │ 🟡 28% │ 🟡 54% │ 🟢 72% │
│ Set/25   │  15  │ 🔴 13% │ 🟡 40% │ 🟡 60% │
└────────────────────────────────────────────────┘
```

- React Query (`queryKey: ['admin-activation-cohorts']`)
- Células com cores semânticas (`bg-success/10`, `bg-warning/10`, `bg-destructive/10`)
- Insight em destaque no topo do card
- Skeleton enquanto carrega

### Integração

`AdminOverview.tsx` — adicionar `<ActivationCohorts />` logo abaixo do `<FunnelCard />`.

## Decisões assumidas

- **Ativação** = workspace registra ≥1 feedback OU ≥1 review OU ≥1 meeting_transcript na janela.
- **D1/D7/D30** acumulativos (D7 inclui D1).
- **6 meses** de histórico.

## Arquivos

- Migration: nova RPC `admin_activation_cohorts`
- `src/components/admin/ActivationCohorts.tsx` (novo)
- `src/components/admin/AdminOverview.tsx` (integrar)

Zero impacto em outras telas, RLS, ou rotas.
