# Criar os 4 preços do Rhitmo v2 no Stripe

Criação dos SKUs da Fase 2 (assento sem bot + add-on de bot), sem conectar em nenhum checkout.

## Padrão confirmado nos preços atuais

Consultei os dois price_id que estão em `create-checkout-session`:

- Mensal `price_1TUqnLIF4fHxJpjH3WthrrBs`: BRL, `livemode: true`, `unit_amount: 4990`, `interval: month`
- Anual `price_1TUqnmIF4fHxJpjHG44CIrIL`: BRL, `livemode: true`, `unit_amount: 47880`, `interval: year`

Ou seja: o anual é cobrado de uma vez pelo ano inteiro, com **20% de desconto** sobre 12 meses (R$ 49,90 × 12 = R$ 598,80 → R$ 478,80, equivalente a R$ 39,90/mês). Modo **live**. Os novos preços seguem o mesmo padrão: BRL, live, anual = 12 meses com 20% off.

## O que será criado

| Produto | Price mensal | Price anual (20% off) |
|---|---|---|
| Rhitmo — Assento v2 | R$ 10,00 (`1000`) | R$ 96,00 (`9600`) — equiv. R$ 8,00/mês |
| Rhitmo — Add-on Bot v2 | R$ 19,90 (`1990`) | R$ 190,80 (`19080`) — equiv. R$ 15,90/mês |

O anual do add-on sai de R$ 19,90 × 12 × 0,8 = R$ 191,04, arredondado para R$ 190,80 para fechar em um valor mensal redondo (R$ 15,90), no mesmo espírito do R$ 39,90 do preço atual.

Metadados em cada objeto para o Fase 2 achar sem ambiguidade: `plan: rhitmo_v2`, `sku: seat` ou `sku: bot_addon`, `cycle: monthly|annual`, e no add-on `included_bot_hours: 4`.

## Como será executado

Não vou criar Edge Function nem script no repositório para isso: são quatro chamadas únicas de criação, e eu tenho acesso direto à API do Stripe pelas ferramentas de escrita (`PostProducts` e `PostPrices`). Um script temporário no projeto seria código morto no dia seguinte. As chamadas de escrita no Stripe pedem confirmação sua em um link de aprovação; vou apresentar esse link quando aparecer.

Sequência:

1. `POST /v1/products` → "Rhitmo — Assento v2"
2. `POST /v1/prices` × 2 → mensal 1000 e anual 9600, BRL, recurring
3. `POST /v1/products` → "Rhitmo — Add-on Bot v2"
4. `POST /v1/prices` × 2 → mensal 1990 e anual 19080, BRL, recurring
5. `GET /v1/prices` filtrando por produto para confirmar os 4 objetos ativos

Nada é conectado a `create-checkout-session` ou `stripe-webhook` nesta etapa — nenhum arquivo do projeto é alterado. Ao final, reporto os 4 `price_id` em texto simples.

## Fora de escopo

Checkout, webhook, `seat_addons`, `/v2/billing` e enforcement em `schedule-recall-bot` continuam na Fase 2, em mensagem separada.
