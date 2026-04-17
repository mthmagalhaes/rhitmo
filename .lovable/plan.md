

# Entrega 2 — MRR & Revenue (Inteligência)

Próxima entrega do P0. Adicionar visibilidade de receita real no topo da aba **Inteligência**.

## O que entrega

Bloco `<RevenueOverview />` no topo de `AdminIntelligence.tsx` com:

1. **MRR atual** (BRL) — soma de `seat_quantity × price` das subscriptions ativas
2. **Tendência 4 semanas** — sparkline com MRR ao final de cada semana
3. **Trial vencendo em 7 dias** — contagem + lista expansível (workspace + dias restantes + plan_tier)
4. **Conversão Trial → Paid (90d)** — % de trials iniciados nos últimos 90 dias que viraram `active`
5. **Distribuição por plano** — Pulse / Pro / Business com receita por tier

## Implementação técnica

### Migration: nova RPC `admin_revenue_metrics()`

```sql
CREATE FUNCTION admin_revenue_metrics() RETURNS jsonb
SECURITY DEFINER ... AS $$
DECLARE
  -- Hardcoded BRL pricing (alinhado com mem://monetization/)
  v_pulse_price numeric := 0;
  v_pro_price numeric := 49;
  v_business_price numeric := 69;
  ...
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  -- MRR atual: sum por tier × seat_quantity
  -- Trial expiring: subscriptions WHERE status='trialing' AND trial_end <= now()+7d
  -- Conversion: trials criados últimos 90d que estão active hoje
  -- Por plano: count + sum
  
  RETURN jsonb_build_object(
    'mrr_total', ...,
    'mrr_by_tier', jsonb_build_object('pro', ..., 'business', ...),
    'mrr_trend_4w', jsonb_agg(...),
    'trial_expiring_7d', jsonb_agg(jsonb_build_object('workspace_name', ..., 'days_left', ..., 'plan_tier', ...)),
    'trial_to_paid_rate_90d', ...,
    'subscriptions_by_tier', ...
  );
END $$;
```

**Trend 4w**: para cada semana W (W-3 → W), conta subscriptions com `current_period_start <= week_end AND (canceled_at IS NULL OR canceled_at > week_end)` e calcula MRR daquela snapshot.

### Componente `src/components/admin/RevenueOverview.tsx`

Layout (1 hero + 4 médios) seguindo Bento `rounded-2xl`:

```
┌─────────────────────────┬───────────────────────┐
│ MRR Total               │ Trial Vencendo (7d)   │
│ R$ 2.450 ↗ +12%         │ 3 workspaces          │
│ [sparkline 4 semanas]   │ [lista expansível]    │
├──────────┬──────────────┼───────────────────────┤
│ Conv     │ Pulse 12     │ Pro: R$ 1.470 (30)    │
│ T→P 18%  │ Pro 30       │ Business: R$ 980 (14) │
└──────────┴──────────────┴───────────────────────┘
```

- React Query com `queryKey: ['admin-revenue-metrics']`
- Sparkline via SVG inline (sem libs novas)
- Trial expiring lista colapsada por padrão; expand mostra workspace name + days_left badge (vermelho se ≤2d, amarelo se ≤5d)
- Skeletons enquanto carrega

### Integração

`src/components/admin/AdminIntelligence.tsx` — adicionar `<RevenueOverview />` antes do bloco "Top cards" existente. Manter os 4 cards atuais (Saúde Média, Em Risco, Assinaturas Ativas, Feedbacks/Semana) abaixo.

## Decisões já assumidas (das respostas anteriores)

- **Preços hardcoded em BRL** (Pro R$49, Business R$69, Pulse R$0). Sem chamada à Stripe API.
- Conversão Trial→Paid por janela de 90 dias.

## Arquivos

- Migration: nova RPC `admin_revenue_metrics`
- `src/components/admin/RevenueOverview.tsx` (novo)
- `src/components/admin/AdminIntelligence.tsx` (integrar componente no topo)

Zero impacto em rotas, RLS de tabelas existentes, ou outras telas.

