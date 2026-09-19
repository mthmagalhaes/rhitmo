# Novo modelo comercial: todo assento pago, add-on só do líder, trial de 14 dias

## O que muda na prática

| | Hoje | Depois |
|---|---|---|
| Quem paga | líder + 3 liderados grátis, cobra do 4º | todo assento é pago, inclusive o do líder |
| Preço | R$ 10/mês ou R$ 8/mês no anual | igual (preços já existentes) |
| Bot | add-on por liderado, R$ 19,90 por 4h | add-on único do líder, R$ 29,90 por 6h |
| Entrada | plano grátis para sempre | 14 dias de teste com tudo liberado, sem cartão |
| Fim do teste | — | leitura continua, ações novas travam até assinar |

Quem já usa hoje mantém as condições atuais (marcado como legado), sem cobrança retroativa.

## Passos

### 1. Trial de 14 dias
- Nova data de fim de teste na empresa, preenchida na criação do workspace (14 dias).
- Empresas existentes entram como legado: seguem no modelo antigo até você decidir migrá-las.
- Faixa no topo do produto com os dias restantes e botão "Assinar agora"; nos últimos 3 dias fica em destaque.
- Página de assinatura mostra o estado do teste em vez de "plano gratuito".

### 2. Trava pós-teste
Com o teste vencido e sem assinatura ativa: a empresa continua visível e exportável, mas ficam bloqueados criar liderado, enviar bot, gerar rascunho de avaliação e perguntar à Rhitmo. Cada bloqueio leva direto ao checkout. Nada é apagado.

### 3. Assentos: todo mundo paga
- A conta de assentos passa a ser: liderados + o próprio líder, sem descontar os 3 grátis.
- Checkout, recontagem automática ao adicionar/remover pessoa e a tela de assinatura passam a usar essa conta.
- Empresas legadas continuam com a regra antiga.

### 4. Add-on do bot só no líder
- Novo preço no Stripe: R$ 29,90/mês e R$ 287,04/ano, com 6h por ciclo.
- O add-on deixa de ser por liderado e passa a ser um por líder; as horas viram uma bolsa do líder, consumida por qualquer reunião dele.
- A tela de assinatura troca a lista de chaves por liderado por um único controle "Bot de reunião do líder" com a barra de horas do ciclo.
- Add-ons por liderado que existirem hoje são convertidos em um add-on do líder na virada, sem cobrança dupla.
- O trial vitalício de 5h de bot sai de cena: agora as horas de bot vêm do teste de 14 dias (6h liberadas) ou do add-on.

### 5. Página pública
- Preço deixa de ser "líder + 3 grátis" e passa a ser "R$ 10 por pessoa/mês, R$ 8 no anual" com o selo "14 dias de teste, sem cartão".
- Add-on descrito como "Bot de reunião do líder — R$ 29,90/mês, 6h".
- A linha do comparativo "Plano gratuito real, não trial de 14 dias" sai (virou falso) e dá lugar a "Teste completo sem cartão".
- Perguntas frequentes e textos em inglês atualizados com os mesmos números.
- Botão continua "Começar teste grátis" apontando para o cadastro.

## Detalhes técnicos

- Migração: `workspaces.trial_ends_at timestamptz`, `workspaces.billing_model text default 'v3'` (existentes recebem `'legacy'`), default de trial no fluxo de criação de workspace; `seat_addons.leader_user_id uuid` com `member_id` nullable para o add-on do líder.
- `_shared/stripeV2.ts`: novos `V2_BOT_ADDON_PRICE_IDS` (6h) via `stripe--create_stripe_product_and_price`, `V2_ADDON_INCLUDED_HOURS = 6`; manter os IDs antigos numa constante `LEGACY_*` para reconhecer assinaturas vigentes no webhook.
- `create-checkout-session`: remover `FREE_SEATS` para `billing_model = 'v3'` (seats = `team_members` + 1 do líder), `botSeats` vira booleano `botAddon` com quantidade 1.
- `toggle-seat-addon`: passa a operar por líder (`leader_user_id`), quantidade fixa 1, mantendo a cadeia de permissão atual.
- `schedule-recall-bot`: no ramo v2, resolver bolsa por líder — add-on ativo → 6h/ciclo; sem add-on e dentro do trial → 6h do período de teste; fora dos dois → bloqueio com mensagem pt-BR e link para assinar. Remove `bot_trial_hours_used` do caminho v3 (fica só para legado).
- `get_v2_bot_seats` reescrita para devolver uma linha por líder; `useV2BotSeats.ts` e `src/pages/v2/Billing.tsx` ajustados ao novo formato; `useBotHoursUsage` inalterado para legado.
- `stripe-webhook`: reconhecer o novo preço de add-on, gravar `seat_addons` com `leader_user_id`, `included_hours = 6`.
- Novo hook `useTrialStatus` + componente de faixa no `AppLayout`, e guarda `useBillingGate` usada nos pontos de bloqueio.
- `usePlanLimits.ts` deixa de usar R$ 49,90/39,90 no caminho v3 (segue no legado).
- `src/pages/Landing.tsx`: `PricingSection`, tabela comparativa e FAQ pt/en.

Sem mudança de RLS de conteúdo, sem apagar dados e sem tocar no produto de demonstração.
