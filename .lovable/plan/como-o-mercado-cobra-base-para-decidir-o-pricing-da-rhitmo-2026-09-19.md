# Como o mercado cobra: base para decidir o pricing da Rhitmo

Objetivo: reunir o que Opre, 15Five (com Kona) e Windmill cobram hoje, comparar com a nossa estrutura de custo real e recomendar uma fórmula de cobrança (todos os usuários, só o líder, ou híbrido).

## O que a pesquisa já mostrou

| Empresa | Unidade de cobrança | Preço | Leitura |
|---|---|---|---|
| Windmill | Assento provisionado (qualquer membro) | 10 primeiros grátis, US$ 10/assento/mês depois | Tudo incluso, sem tiers. Assento conta mesmo sem login |
| 15Five | Assento por funcionário | US$ 4 (Engage), US$ 11 (Perform), US$ 16 (Total), anual | Tiers por profundidade, IA própria inclusa no assento |
| Kona (dentro do 15Five) | Duas unidades diferentes | US$ 2/funcionário/mês (assistente de reunião) + US$ 19/gestor/mês (coach) | O que consome reunião é barato e por funcionário; o que é coaching de líder é caro e por gestor |
| Opre | Por funcionário | US$ 25/funcionário/mês, anual, tudo incluso, assentos de admin grátis | Posiciona como "pague por insight, não por pesquisa" |

Padrões que aparecem nos quatro: (1) a unidade dominante é o funcionário, não o líder; (2) quem separa coaching de líder cobra caro por gestor e barato por funcionário; (3) faixa grátis generosa é usada como entrada (Windmill, 10 assentos).

## O que falta checar antes de recomendar

- Confirmar preço e política de assento grátis de dois concorrentes próximos do nosso porte (Lattice e um player BR, se houver), para não ancorar só em preço americano.
- Converter todas as referências para BRL no câmbio interno (5,80) e comparar com o nosso R$ 10/assento + R$ 19,90 de add-on.
- Cruzar cada modelo com o nosso custo real: bot R$ 4,37/h, IA por líder ativo, infra por empresa. Cobrar por funcionário só funciona se o custo variável (bot) estiver amarrado a quem realmente grava.

## O que será entregue

Um documento em Arquivos, `rhitmo-pricing-benchmark.md`, com:

1. Tabela comparativa dos concorrentes, com fonte e data de captura.
2. Os três modelos possíveis para a Rhitmo, cada um simulado nos mesmos tamanhos de time da simulação anterior (líder + 3 até líder + 20):
   - **A — só o líder paga**: assento de líder mais caro, liderados grátis e ilimitados.
   - **B — todos pagam** (modelo Windmill/15Five): preço baixo por pessoa, N grátis de entrada.
   - **C — híbrido**: pessoa barata + consumo de bot como add-on (é o que temos hoje, R$ 10 + R$ 19,90).
3. Para cada modelo: receita, custo, margem, previsibilidade, risco de o cliente limitar quem entra na plataforma e facilidade de venda para RH.
4. Recomendação única com preço sugerido, o que muda na página pública e no checkout, e o alerta de que o cálculo interno de limites ainda usa o preço legado de R$ 49,90.

Nenhuma alteração de código, banco, preço cobrado ou página pública nesta etapa: é material de decisão. A execução do preço escolhido vira uma mensagem separada.

## Detalhes técnicos

Pesquisa via busca web nas páginas oficiais de preço; simulação em Python reutilizando as premissas de `supabase/functions/_shared/recallPricing.ts` e a planilha `rhitmo-simulacao-margens.xlsx` já entregue, acrescentando uma aba por modelo (A, B, C) com as mesmas premissas editáveis.
