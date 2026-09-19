# Simulação de custo, receita e margem por tamanho de time

Objetivo: uma planilha de decisão que mostre, para cada tamanho de time (líder + 3, + 4, + 5, + 6 ... até + 20), quanto entra, quanto custa e quanto sobra — com e sem o add-on de bot.

## Preços reais hoje (confirmados no código de cobrança)

- Líder + 3 liderados: grátis. Sem horas de bot no assento.
- Assento pago (4º liderado em diante): R$ 10,00/mês (R$ 8,00/mês no anual).
- Add-on de bot: R$ 19,90/mês por assento, inclui 4h de gravação/transcrição.
- Trial vitalício de 5h de bot para experimentar.
- Observação: a tela de assinatura antiga e o cálculo interno de limites ainda falam em R$ 49,90. Fica de fora desta simulação (é preço legado da versão 1), mas entra como alerta no documento.

## Custos reais por hora de bot (fatura de julho)

- Máquina: US$ 0,50/h · Transcrição: US$ 0,15/h · Armazenamento: +16% sobre o direto.
- Efetivo: US$ 0,72/h ≈ R$ 4,18/h (câmbio 5,80 usado internamente).
- IA de texto (pautas, resumos, Pergunte à Rhitmo): roda no modelo barato, custo por líder ativo baixo mas não zero — entra como valor por líder/mês, com premissa declarada.
- Taxa de pagamento: 4,5% sobre a receita.
- Infraestrutura fixa: rateio por empresa, com premissa declarada.

Não há histórico de horas medidas em produção ainda (nenhum evento de uso registrado), então o consumo de bot entra como cenário, não como dado.

## O que a simulação vai mostrar

Três cenários de uso do add-on, aplicados a cada tamanho de time:
- **Leve** — 2h de bot por assento com add-on (metade da franquia).
- **Cheio** — 4h, a franquia inteira.
- **Estouro** — 5h, com a hora extra cobrada a R$ 8 (mostra que o excedente protege a margem).

Para cada linha: receita mensal, custo de bot, custo de IA, taxa de pagamento, custo fixo rateado, lucro em reais e margem em %.

Blocos do documento:
1. Líder + 3 (grátis) — só custo, sem receita: quanto custa manter uma empresa que nunca paga.
2. Líder + 3 com add-on ligado — primeira receita possível.
3. Tabela de líder + 4 até líder + 20, sem add-on.
4. Mesma tabela, com add-on em todos os assentos pagos.
5. Mesma tabela, com add-on em metade dos assentos (o caso mais provável).
6. Pontos de decisão: a partir de quantos liderados a empresa se paga, quanto custa o plano grátis por mês, e se o add-on de R$ 19,90 cobre 4h (custo ~R$ 16,70) com folga suficiente.

## Entrega

- Documento `rhitmo-simulacao-margens.md` em Arquivos, com as tabelas prontas para leitura.
- Planilha `rhitmo-simulacao-margens.xlsx` com as premissas editáveis (preço do assento, preço do add-on, horas usadas, câmbio, custo fixo), para você mexer nos números sem depender de mim.
- Resumo em uma tela no chat com as três conclusões principais.

## Detalhes técnicos

Cálculo em Python (pandas + xlsxwriter) a partir das constantes já existentes em `supabase/functions/_shared/recallPricing.ts` e `supabase/functions/_shared/stripeV2.ts`; nenhuma alteração no produto, no banco ou nos preços cobrados. A planilha usa fórmulas ligadas a uma aba de premissas, não valores fixos.
