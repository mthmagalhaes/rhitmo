# Relatório de custos por usuário (admin) + novo pricing

Dois entregáveis: (1) uma aba **Custos** no painel admin com horas e custo por usuário/empresa; (2) uma revisão de pricing calibrada pelo custo real de US$0,72/h de bot.

## O problema de dados (verificado)

Hoje não dá para montar o relatório: existem 148 registros em `recall_bots` e 65 transcrições, mas **nenhuma tem duração gravada** — `meeting_transcripts.duration_seconds` está zerado/nulo em 100% das linhas, e `recall_bots` não tem coluna de duração. O webhook do Recall até calcula `started_at`/`ended_at` da gravação para uma checagem de segurança, mas descarta esses valores.

O custo de IA já é estimado por chamada (`aiPricing.ts` + `aiGateway.ts`) e escrito em `function_logs`, porém a tabela tem só 14 linhas — a instrumentação existe mas praticamente não gerou histórico, então o relatório vai começar a acumular a partir de agora.

## Etapa 1 — Medir

- Nova tabela `bot_usage_events`: workspace, usuário (líder), member, bot, início/fim, minutos de máquina, minutos de transcrição, custo estimado em USD e BRL, câmbio usado.
- `recall-webhook` passa a persistir `started_at`/`ended_at` da gravação (já disponíveis no payload) e a gravar o evento de uso ao concluir o bot; também preenche `meeting_transcripts.duration_seconds`.
- Backfill: para os bots já concluídos, buscar duração no payload salvo quando existir; onde não houver, marcar como "não medido" em vez de inventar número.
- Custo de IA: consolidar o que já é estimado em `function_logs` por usuário/mês.
- Preços em constante única compartilhada (machine US$0,50/h, transcrição US$0,15/h, storage US$0,0000694444/unidade, câmbio configurável).

## Etapa 2 — Relatório no admin

Nova aba **Custos** em `/admin` (ao lado de Visão geral / Pessoas / Empresas), restrita ao super admin:

- Cartões do mês: horas de bot, horas transcritas, **eficiência de transcrição** (transcrição ÷ máquina, meta > 85%), custo Recall, custo IA, custo total, custo por assento pago.
- Tabela **por usuário**: nome, empresa, reuniões, horas de bot, horas transcritas, custo Recall, custo IA, custo total, receita do assento e margem. Ordenável por custo, com destaque para quem está com margem negativa.
- Tabela **por empresa** com o mesmo conjunto de colunas e o teto de horas do plano.
- Filtro por mês e exportação CSV.

## Etapa 3 — Pricing sugerido (mercado BR)

Recomendação como owner: manter preço por assento simples (o brasileiro compra mal pay-as-you-go puro) e colocar o consumo dentro de um **teto generoso por workspace**, com pacote extra barato. Assim o preço fica previsível e o abuso fica coberto.

| | Grátis | Rhitmo (assento) |
|---|---|---|
| Preço | R$ 0 | R$ 59,90/mês por assento pago (R$ 47,90 no anual) |
| Assentos | líder + 3 liderados | ilimitados |
| Horas de bot | 4h/mês por workspace | 8h/mês por workspace + 4h por assento pago |
| Excedente | bloqueia (upload/Granola seguem livres) | pacote de 5h por R$ 39 ou R$ 8/h avulsa |
| Retenção de gravação | 30 dias | 90 dias (arquivamento após) |

Racional: com US$0,72/h e câmbio 5,80, cada hora custa ~R$4,20. Um assento de R$59,90 com 4h inclusas gasta ~R$17 e sobra ~70% de margem bruta; o teto de workspace cobre o líder que grava tudo sem quebrar a conta. Quem hoje é grandfathered/beta continua como está até a data já definida.

Também entra: retenção de 90 dias com expurgo automático (o storage é cumulativo e já é ~16% da fatura) e aviso no app quando o workspace passa de 80% do teto.

## Detalhes técnicos

Migração para `bot_usage_events` (com GRANTs e RLS de super admin), ajuste no `recall-webhook` e num job de expurgo de gravações, novo hook `useAdminCostReport` + componente `AdminCosts.tsx`, e atualização de `usePlanLimits.ts` com os novos tetos. `cost-analysis.md` recebe a seção do novo pricing. O enforcement de teto (bloquear agendamento acima do limite) entra em `schedule-recall-bot`.

Se você quiser, posso fatiar: Etapa 1+2 primeiro (medir e enxergar), e o pricing só depois de um mês de dados reais.
