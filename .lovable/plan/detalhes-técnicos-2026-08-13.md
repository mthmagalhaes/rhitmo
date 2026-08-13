Hoje a gente não possui usuários pagantes, podemos fazer as modificações que quisermos. Só precisamos garantir que esta ação, agora que a gente tem os custos mapeados, se sustenta.  
  
Etapa 3 — Pricing sugerido (mercado BR)

Recomendação como owner: manter preço por assento simples (o brasileiro compra mal pay-as-you-go puro) e colocar o consumo dentro de um **teto generoso por workspace**, com pacote extra barato. Assim o preço fica previsível e o abuso fica coberto.


| &nbsp;               | Grátis                                  | Rhitmo (assento)                                  |
| -------------------- | --------------------------------------- | ------------------------------------------------- |
| Preço                | R$ 0                                    | R$ 59,90/mês por assento pago (R$ 47,90 no anual) |
| Assentos             | líder + 3 liderados                     | ilimitados                                        |
| Horas de bot         | 4h/mês por workspace                    | 8h/mês por workspace + 4h por assento pago        |
| Excedente            | bloqueia (upload/Granola seguem livres) | pacote de 5h por R$ 39 ou R$ 8/h avulsa           |
| Retenção de gravação | 30 dias                                 | 90 dias (arquivamento após)                       |


Racional: com US$0,72/h e câmbio 5,80, cada hora custa ~R$4,20. Um assento de R$59,90 com 4h inclusas gasta ~R$17 e sobra ~70% de margem bruta; o teto de workspace cobre o líder que grava tudo sem quebrar a conta. Quem hoje é grandfathered/beta continua como está até a data já definida.

Também entra: retenção de 90 dias com expurgo automático (o storage é cumulativo e já é ~16% da fatura) e aviso no app quando o workspace passa de 80% do teto.

## Detalhes técnicos

Migração para `bot_usage_events` (com GRANTs e RLS de super admin), ajuste no `recall-webhook` e num job de expurgo de gravações, novo hook `useAdminCostReport` + componente `AdminCosts.tsx`, e atualização de `usePlanLimits.ts` com os novos tetos. `cost-analysis.md` recebe a seção do novo pricing. O enforcement de teto (bloquear agendamento acima do limite) entra em `schedule-recall-bot`.

Se você quiser, posso fatiar: Etapa 1+2 primeiro (medir e enxergar), e o pricing só depois de um mês de dados reais.