
# Pricing v3 — Modelo Windmill (single plan + per-seat)

## 1. Modelo final

**Um plano só. Tudo incluído. Cobrança por liderado.**

- **Líder + 3 liderados grátis** para sempre — sem cartão.
- **Recall com cap de 6h/mês/workspace** no tier gratuito.
- **A partir do 4º liderado:** R$ 49,90/liderado/mês, com Recall ilimitado para o workspace inteiro.
- **Anual com 16% off:** R$ 502,80/liderado/ano (≈ R$ 41,90/mês equivalente).
- **Líder não conta como seat cobrável.** Só liderados.

Conta unitária (workspace de 1 líder + 5 liderados):
- 3 grátis + 2 pagos × R$49,90 = **R$ 99,80/mês** (ou R$ 1.005,60/ano com desconto).
- Custo Recall ilimitado: ~R$26/mês (10h × R$2,61). Margem ~74%.

## 2. Migração de workspaces atuais (Grandfather 6 meses)

Hoje temos 6 workspaces (`pulse`/`pro`/`business`). Plano:

- Adicionar `grandfather_until DATE` em `workspaces` = **2026-11-08** para todos os 6 ativos hoje.
- Durante esse período: tratam-se como se tivessem **seats ilimitados grátis** + Recall ilimitado, independente do `plan_tier`.
- Aviso por email/Slack em **D-60** e **D-30** explicando o novo modelo e oferecendo conversão antecipada com bônus (ex.: 2 meses grátis no anual).
- Após 08/11/2026: aplicam-se os limites do novo modelo. Quem não pagar pelos seats excedentes vê os liderados além de 3 ficarem em estado **"read-only / pendente de plano"** (continuam visíveis, mas bloqueia novos feedbacks/1:1s/reviews neles). Sem cobrança retroativa, sem perda de dados.

Faster Ops (workspace `business` legado) continua tratado como fundador — mantém o badge atual e o grandfather.

## 3. Mudanças técnicas

### 3.1. Banco
Migration única:
- `ALTER TABLE workspaces ADD COLUMN grandfather_until DATE`, `paid_seats INT DEFAULT 0`, `seat_cycle TEXT DEFAULT 'monthly'` (`monthly`/`annual`).
- UPDATE nos 6 workspaces existentes setando `grandfather_until = '2026-11-08'`.
- Function `effective_seat_allowance(workspace_id)` retornando `{free_seats, paid_seats, recall_unlimited, is_grandfathered}` — usada por `usePlanLimits` e Edge Functions de billing/Recall.

### 3.2. Frontend
- **`usePlanLimits`** reescrito para o novo modelo único:
  - `freeSeats = 3`, `paidSeats` vindo do workspace, `totalSeats = free + paid + (grandfather ? Infinity : 0)`.
  - `canAddMember = memberCount < totalSeats`.
  - `recallCapHours = grandfathered || paidSeats > 0 ? Infinity : 6`.
- **`Billing.tsx`** redesenhado no estilo Windmill: card único, headline "Líder + 3 liderados grátis", preço grande "R$ 49,90 /liderado/mês" com toggle mensal/anual, bullets das features (todas incluídas), CTA único.
- **`Landing.tsx` — seção pricing:** mesmo card único, sem comparativo Pulse/Pro/Enterprise. Remove menções a "Pulse"/"Pro" no copy.
- **Banner de grandfather** no topo de `/billing` para os 6 workspaces atuais explicando até quando é grátis e o que acontece depois.

### 3.3. Stripe / Edge Functions
- Novo product **"Rhitmo Seat"** com 2 prices: R$ 49,90 mensal recorrente, R$ 502,80 anual recorrente, ambos com `quantity` ajustável.
- `create-checkout-session`: passa `quantity = numero_de_seats_pagos` (membros atuais − 3, mínimo 1) e cycle escolhido.
- `stripe-webhook`: ao receber `subscription.updated`, grava `paid_seats` e `seat_cycle` em `workspaces`.
- `update-subscription`: nova rota `setSeats(qty, cycle)` para upgrade/downgrade quando o líder adiciona/remove liderado pagante.
- `usePlanLimits` chama `setSeats` automaticamente quando `memberCount` cruza o limite (com confirmação modal).

### 3.4. Limpeza
- Remover do código: `CYCLE_PRICING` (3 ciclos), tier `pulse`/`business` no enum visual, comparativos de planos, badges "Founder lifetime" do tier business (mantidos no banco como flag, só esconder UI).
- `plan_tier` mantido na tabela por compatibilidade, mas não influencia mais em limits — todo o gating vem de `paid_seats + grandfather_until`.

## 4. Comunicação (D+0)

Email + DM Slack para os 6 workspaces:

> "Mudamos o pricing do Rhitmo para algo mais simples: **líder + 3 liderados sempre grátis**, e R$ 49,90/liderado adicional. **Você é Early Adopter** — seu workspace fica 100% liberado até **08/11/2026**, sem mexer em nada. Depois disso, se quiser continuar com mais de 3 liderados, é só ativar o plano. Tudo o que você criou continua seu, sem perda de dados."

## 5. O que NÃO muda neste sprint

- Cobrança real via Stripe dos 6 workspaces atuais (zero por 6 meses).
- Gating de Recall existente (continua valendo o cap atual até a migration ir pra produção).
- Lógica de HR Admin/Owner/Leader e RLS — intocada.

## 6. Ordem de execução

1. Migration (`grandfather_until`, `paid_seats`, `seat_cycle`, function helper) + UPDATE dos 6 workspaces.
2. `usePlanLimits` + componentes que dependem (`useEnforcedLimits`, banners).
3. `Billing.tsx` redesenhado no estilo Windmill.
4. `Landing.tsx` seção pricing single-card.
5. Stripe: criar product/prices + ajustar `create-checkout-session`, `stripe-webhook`, `update-subscription`.
6. Banner de grandfather + email de comunicação (template novo em `_shared/email-templates/`).

```text
Workspace
├── 1 líder (grátis sempre)
├── 3 liderados grátis (free tier)
├── liderados extras → R$ 49,90/mês cada (ou R$ 502,80/ano)
└── grandfather_until = 2026-11-08 (para os 6 atuais)
```
