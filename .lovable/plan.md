# Texto da página pública nas quatro camadas

## O que significa

Hoje a página pública vende a Rhitmo pela tarefa que ela poupa: "nunca mais escreva uma avaliação do zero". Isso funciona como isca, mas explica só o último passo do produto. O que a Rhitmo realmente construiu é uma sequência: ela guarda as pessoas, junta as evidências do dia a dia, enxerga padrões ao longo do tempo e devolve percepções acionáveis.

As "quatro camadas" são exatamente essa sequência:

1. **Pessoas** — quem trabalha com quem, quem lidera quem, o que se espera de cada cargo.
2. **Evidências** — o que de fato aconteceu: anotações de 1:1, notas importadas do note taker, feedbacks, sinais do Slack, reuniões.
3. **Padrões** — o que se repete: ritmo de conversas, colaboração entre áreas, temas recorrentes, riscos que crescem.
4. **Percepções** — o que fazer com isso: pauta de 1:1, rascunho de avaliação, alerta de risco, pré-leitura de calibração.

A proposta é reescrever o texto da página para contar essa história, em vez de listar funcionalidades soltas.

## O que muda na página

- **Título e subtítulo**: continuar concreto, mas ancorar no resultado final e no caminho. Ex.: "Sua liderança tem um histórico. A Rhitmo transforma ele em decisões." com subtítulo explicando que ela parte das conversas que já acontecem.
- **Nova seção "Como a Rhitmo funciona"**: quatro blocos curtos, um por camada, cada um com uma frase de promessa e um exemplo real do produto (nota importada, mapa de colaboração, rascunho de avaliação com citações).
- **Seções por público** (líderes, liderados, RH): reescrever cada uma amarrando na camada que mais importa para aquele público — líder vive das evidências e das percepções, liderado da transparência, RH dos padrões.
- **Prova sem invenção**: nenhum número, depoimento ou selo que não exista. Onde hoje há promessa genérica, trocar por descrição verificável do que a ferramenta faz.
- **Português e inglês**: os dois blocos de texto atualizados juntos, mantendo o tom Early Adopter e sem travessões longos.

Preço, planos, FAQ e todo o visual permanecem como estão. É trabalho de texto, não de layout.

## Detalhes técnicos

- Alterações concentradas no objeto de textos `copy` (`pt` e `en`) em `src/pages/Landing.tsx` e nos blocos que o consomem (hero, seções por público).
- Nova seção das quatro camadas montada com os mesmos padrões visuais já usados na página (cartões arredondados, sombra suave, serif nos títulos).
- Metadados de busca (título, descrição, og) atualizados para refletir o novo posicionamento; um único H1 mantido.
