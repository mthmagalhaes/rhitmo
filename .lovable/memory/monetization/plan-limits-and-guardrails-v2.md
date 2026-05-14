---
name: Plan Limits & Guardrails v2
description: Plano único pós-Pricing v3 (08/05/2026) — primeiros 3 usuários grátis, R$ 39,90–49,90/seat a partir do 4º; sem limites artificiais de Mentor/avaliação
type: feature
---

Pricing v3 (08/05/2026) substituiu o antigo "Plano Pulse" por **plano único per-seat**:

- **Líder + 3 usuários grátis** (líder + 2 liderados ainda contam? não — são 3 seats totais incluindo o líder OU 3 liderados além do líder? confirmar com `usePlanLimits`/`get_user_caps`. Copy oficial da landing e do PersonaSelector hoje diz "primeiros 3 usuários grátis" / "primeiros 3 liderados grátis").
- **R$ 49,90/liderado/mês** (mensal) ou **R$ 39,90/liderado/mês** (anual, 16% off) a partir do 4º.
- **Sem teto** de Mentor AI, 1:1s, Pulse, PDI, 360°, transcrição de reuniões, Slack ou bias detection no plano grátis. Tudo ilimitado dentro do limite de seats.
- **Enterprise**: a partir de 50 colaboradores, R$ 750/mês mínimo, faturamento anual.

Guardrails ativos:
- `usePlanLimits` + gates no `NewMemberDialog`/`Pessoas` bloqueiam o convite do 4º liderado e disparam upsell.
- `get_user_caps` RPC é fonte de verdade para o cap real por workspace.
- Não há mais limite de "20 conversas/mês" no Mentor AI nem "1 avaliação por mês" — qualquer cópia que mencione isso está obsoleta (PersonaSelector foi atualizado em 14/05/2026).

Tom de comunicação:
- "Comece grátis", "Primeiros 3 usuários grátis", "Sem cartão. Cancele quando quiser."
- Não usar mais o termo "Plano Pulse" em copy de marketing/onboarding.
