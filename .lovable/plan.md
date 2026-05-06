## Objetivo
Zerar a cobrança da assinatura de **matheus.magalhaes@fstr.co** (Owner do workspace Faster Ops, user `79a6f679-7920-42e2-9727-1fcee6edbf5a`) sem cancelar o acesso. Ele continua como assinante ativo Pro, mas as próximas faturas saem em R$ 0.

## Conta no Stripe (confirmada via DB + Stripe API)
- Customer: `cus_U9JsFzXCJwkPXH`
- Subscription ativa: `sub_1TBhYwIF4fHxJpjHACfKhfQq`
- Item: `si_UA1cwyNPYhVw2b` — preço `price_1TCQf0IF4fHxJpjH4Bx2aIbg` (Pro), quantity 3

## Passos

1. **Criar cupom 100% off forever** via `stripe--create_coupon`
   - `name`: "Cortesia FSTR — 100% off"
   - `percent_off`: 100
   - `duration`: "forever"

2. **Aplicar o cupom direto na subscription** via `stripe--stripe_api_execute` (`PostSubscriptionsSubscription`), usando `discounts[0][coupon]` = id do cupom criado. Aplico no nível da subscription (não no customer) para isolar o benefício a essa assinatura específica.

3. **Validar** lendo a subscription de novo e conferindo que `discount.coupon.percent_off === 100` e a próxima invoice prevista é R$ 0.

## Efeitos
- Acesso intacto: subscription continua `active`, mesmos 3 seats Pro, mesma data de renovação.
- Próximas renovações: fatura gerada em R$ 0, sem cobrança no cartão dele.
- Reversível a qualquer momento removendo o discount da subscription.

## Não faremos
- Não cancelaremos a subscription.
- Não removeremos o cartão salvo (continua no perfil dele, só não será usado).
- Não emitiremos reembolso das cobranças anteriores.
- Nenhuma mudança no código/banco do Rhitmo — operação 100% no Stripe.