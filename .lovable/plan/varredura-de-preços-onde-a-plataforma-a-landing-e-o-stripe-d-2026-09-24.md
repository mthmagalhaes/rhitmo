# Varredura de preços: onde a plataforma, a landing e o Stripe divergem

## O que encontrei

Valor oficial (modelo novo): assento R$ 10/mês ou R$ 8/mês no anual (R$ 96/ano), líder incluído; add-on do bot só no líder, R$ 29,90/mês (R$ 287,04/ano) com 6h; teste de 14 dias sem cartão.

| # | Onde | O que diz hoje | Problema |
|---|---|---|---|
| 1 | Configurações do líder > aba Faturamento (é para lá que "/billing" redireciona, e é o endereço de retorno do checkout) | "Líder + 3 liderados grátis para sempre", R$ 49,90 por liderado a partir do 4º, R$ 478,80/ano | Tela principal de assinatura mostra o modelo antigo. A tela nova só existe em /v2/billing |
| 2 | Tela de escolha de perfil no cadastro (pt/en/es) | "Os 3 primeiros usuários são grátis... pague só a partir do 4º" | Promessa falsa logo na entrada |
| 3 | Cálculo interno de limites | R$ 49,90 / R$ 39,90 e 3 assentos grátis; pede compra de assento a partir do 4º | Pode bloquear ou pedir compra com a regra antiga para empresas novas |
| 4 | Troca de quantidade de assentos (assinatura já ativa) | Sempre desconta 3 grátis | No modelo novo cobraria 4 assentos a menos que o checkout |
| 5 | Mensagem do bot para empresas antigas | "5h de teste... add-on R$ 19,90/mês, 4h" | Correto só para legado; conferir que nunca aparece para empresa nova |
| 6 | Landing, subtítulo de preços (pt/en) | "Sem plano mensal. Cobramos pelo ciclo de 90 dias" | Contradiz o seletor Mensal/Anual logo abaixo |
| 7 | Landing em inglês | "Start free. Scale when it makes sense." | Em pt diz "14 dias de teste"; inglês ainda sugere grátis para sempre |
| 8 | Landing, lista de recursos em inglês | "1:1s, Pulse, IDP and 360°", "38x menos viés" | Diferente do português e com número sem fonte |
| 9 | Horas de bot (medidor na barra lateral e cartão de horas) | "4h por assento pago, ou 4h no plano grátis" | Empresas novas têm 6h por líder |
| 10 | Comentários técnicos no checkout e no retorno do Stripe | Citam R$ 49,90 e R$ 19,90 | Só documentação, mas induzem erro |
| 11 | Stripe | Valores reais dos preços usados não foram conferidos contra o texto | Confirmar que R$ 10, R$ 96, R$ 29,90 e R$ 287,04 batem com o que o Stripe cobra |

## O que vou corrigir

1. **Faturamento único**: a aba Faturamento das configurações passa a mostrar a tela do modelo novo para empresas novas; empresas legadas continuam vendo as condições delas. Retorno do checkout cai nessa mesma tela.
2. **Cadastro**: trocar o texto por "14 dias de teste com tudo liberado, sem cartão" nas três línguas.
3. **Limites internos e troca de assentos**: para empresas novas, contar liderados + líder e usar R$ 10/R$ 8; manter 3 grátis e R$ 49,90 só no legado.
4. **Horas de bot**: medidor e cartão mostram 6h do líder (teste ou add-on) no modelo novo.
5. **Landing**: remover o "sem plano mensal / 90 dias", alinhar o inglês ao português (teste de 14 dias, mesma lista de recursos, tirar o "38x" sem fonte).
6. **Stripe**: ler os quatro preços em uso e confirmar valor, moeda e recorrência; se algum divergir, aviso antes de mudar.
7. **Conferência final**: nova busca por R$ 49,90, 39,90, 19,90, "3 grátis" e "plano grátis" fora do caminho legado, e ver a landing e a aba Faturamento no navegador.

Nada de cobrança retroativa, sem mudar preço de quem já assina e sem apagar dados.

## Detalhes técnicos

- `src/pages/lider/Configuracoes.tsx`: aba `faturamento` renderiza `V2Billing` quando `useBillingStatus().billingModel === 'v3'`, senão `BillingContent` legado.
- `src/pages/PersonaSelector.tsx`: `leaderBadge`/descrição pt/en/es.
- `src/hooks/usePlanLimits.ts`: ramo v3 via `get_billing_status` (sem `FREE_SEATS`, preços 10/8); `needsSeatPurchase` falso durante trial.
- `supabase/functions/update-subscription/index.ts`: ler `billing_model`; v3 → `memberCount + 1`, preço `V2_SEAT_PRICE_IDS`; redeploy.
- `useBotHoursUsage.ts`, `SidebarBotHoursMeter.tsx`, `BotHoursCard.tsx`: v3 usa `get_leader_bot_addon` (cap 6h).
- `src/pages/Landing.tsx`: `pricingSubtitle`/`pricingTooltip`/`pricingAnchor` pt/en, features en.
- Comentários em `create-checkout-session` e `stripe-webhook`.
- Stripe: `GET /v1/prices/{id}` para os 4 IDs de `_shared/stripeV2.ts`.
