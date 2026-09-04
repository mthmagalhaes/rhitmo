# Migrar Faster, Fapeduca e FAP para o v2 sem regressão

Os três workspaces reais têm grandfather válido até 08/11/2026 e hoje, no v1, não têm nenhum teto de horas de bot. O caminho v2 atual só conhece dois cenários (add-on de 4h ou trial vitalício de 5h), então migrar antes de criar o caminho "sem teto" bloquearia os 26 líderes do Faster. A ordem abaixo cria o caminho primeiro e só depois migra.

## Confirmação antes de migrar

Levantamento já feito no banco:

| Workspace | Membros ativos | Grandfather até |
|---|---|---|
| Faster | 26 | 2026-11-08 |
| Fapeduca | 2 | 2026-11-08 |
| FAP - Faculdade Baixo Parnaíba | 2 | 2026-11-08 |

Ficam em v1, sem toque: Iugu, Teste, 4Tax, Ricardo Luiz piccoli (0 membros) e os dois legados (Faster (legado), Workspace de Douglas (legado)) — no total 6 workspaces sem membros ativos.

## Passo 1 — Caminho "sem teto" no agendamento do bot

Em `supabase/functions/schedule-recall-bot/index.ts`, dentro do bloco v2 (a partir da linha ~113): antes de consultar add-on ou trial, verificar se `grandfather_until` do workspace v2 é uma data futura. Se for, o bloco inteiro é ignorado (sem cálculo de horas, sem bloqueio) — mesmo resultado que o workspace tem hoje no v1. Quando o grandfather estiver vencido ou nulo, a lógica de add-on/trial roda exatamente como está.

O campo `grandfather_until` já vem no select da linha 81/86, então não é preciso mudar a consulta.

## Passo 2 — Mostrar isso na tela de assinatura v2

- Ampliar a função de banco `get_v2_bot_seats` com uma base nova, `grandfathered`, retornada quando o workspace tem grandfather válido, junto com a data de validade. Isso é mudança de função, então entra como migração.
- `src/hooks/useV2BotSeats.ts`: aceitar a base `grandfathered` no tipo `V2BotSeat` e expor `grandfatherUntil` no retorno.
- `src/pages/v2/Billing.tsx`: quando a base for `grandfathered`, o card de cada liderado mostra "Sem teto até 08/11/2026 · plano legado" no lugar da barra de progresso, e o card do add-on troca a linha do trial por um aviso de que o workspace está sem teto até a data e o add-on só passa a valer depois disso.

Não existe hoje mini-indicador de horas na barra lateral do v2 (a única tela que consome esses dados é `/v2/billing`), então não há segundo ponto para ajustar.

## Passo 3 — Migração dos dados

Um `UPDATE` (dado, não schema) definindo `ui_version = 'v2'` apenas para os três IDs listados acima, referenciados por id para não depender de acento no nome. Nenhum outro workspace é tocado.

## Verificação

- Simular agendamento de bot para um líder do Faster: nenhum bloqueio de teto.
- `/v2/billing` de um workspace grandfathered: aviso "sem teto" com a data, sem barra de 4h.
- Conferir no banco que só três linhas mudaram para v2.
- Build e checagem de tipos limpos.

## Detalhes técnicos

- Comparação de data igual à já usada no arquivo: `new Date(grandfather_until) >= new Date(new Date().toDateString())`.
- A migração de `get_v2_bot_seats` mantém assinatura e colunas atuais, apenas acrescenta as colunas `is_grandfathered` / `grandfather_until` e o valor `grandfathered` em `basis`.
- O `UPDATE` roda pela ferramenta de dados, não como migração de schema.
