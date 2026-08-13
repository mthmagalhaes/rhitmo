# Custo real do Recall.ai — recalibrar com a fatura de julho/2026

A fatura V1R4A6KP-0006 (serviço Jul/2026) dá, pela primeira vez, números reais de consumo. Ela contradiz duas premissas do `cost-analysis.md`: o custo/hora do bot e a ideia de que storage é gratuito.

## O que a fatura mostra

| Linha | Quantidade | Preço unitário | Valor |
|---|---|---|---|
| Bot Recording Hours | 9,4256 h | US$0,50/h | US$4,71 |
| Storage and Playback | 15.756,97 unidades | US$0,0000694444 | US$1,09 |
| Real-time Transcription | 6,6342 h | US$0,15/h | US$1,00 |
| Crédito pré-pago aplicado | — | — | -US$6,18 |
| **Bruto do mês** | | | **US$6,80** |

Leituras principais:

1. **Machine time é US$0,50/h fixo**, não a faixa US$0,25–0,35 que estava documentada.
2. **Storage e playback não é grátis.** Foram US$1,09 no mês, ~16% da conta, e é um custo que **acumula** enquanto as gravações ficam retidas — cresce mês a mês mesmo se o volume de reunião ficar estável.
3. **Transcrição cobre só 70% das horas de bot** (6,63 h de 9,43 h). Ou seja, ~30% do machine time é bot em sala de espera / reunião sem gravação — desperdício puro, exatamente o que as otimizações de auto-leave atacam.
4. **Custo efetivo por hora de bot: US$0,72** (US$6,80 / 9,4256 h), contra os US$0,45 assumidos. É **60% mais caro** que o modelo atual.

## Impacto nas margens

Com US$0,72/h de bot e câmbio 5,80:

| Cenário | Horas/mês | Custo variável | Receita | Margem |
|---|---|---|---|---|
| Pro (premissa atual, 10 h) | 10 h | ~R$42 | R$49 | ~R$7 (14%) |
| Business (premissa atual, 20 h) | 20 h | ~R$84 | R$69 | **negativa** |
| Pro otimizado (55% do uso) | 5,5 h | ~R$23 | R$49 | ~R$26 (53%) |
| Business otimizado | 11 h | ~R$46 | R$69 | ~R$23 (33%) |

Conclusão: o plano Business só fecha conta **com as otimizações ativas e um teto de horas**. Sem teto, um power user Business dá prejuízo com folga.

## O que vou fazer

Atualizar o `cost-analysis.md` (é o único artefato afetado; nenhum código muda):

- Nova seção com a fatura de julho como fonte real, incluindo a tabela acima.
- Corrigir a seção 2.3: machine time US$0,50/h, transcrição US$0,15/h, **storage US$0,0000694444/unidade (deixa de ser "incluso")**.
- Recalcular seções 4, 5, 9 e 10 (custos por plano, margens, break-even e projeções de 50/100 líderes) com US$0,72/h efetivo.
- Registrar a razão transcrição/machine-time (70%) como KPI de eficiência: quanto mais perto de 100%, menos bot ocioso.
- Reforçar como pendências prioritárias: teto de horas de bot por plano e política de retenção de gravações (para conter o storage acumulado).

## Detalhes técnicos

Sem mudança de código, migração ou edge function. Só recálculo e reescrita do documento de custos. Se você quiser, num passo seguinte dá para transformar o teto de horas em guardrail real (checagem em `schedule-recall-bot`) e uma rotina de expurgo de gravações antigas — mas isso fica fora deste plano.
