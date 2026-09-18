# Proposta executiva da Rhitmo para a Larissa (Caju) — 5 slides

Apresentação curta em PowerPoint editável, no visual Creme/Bento da Rhitmo, com capturas reais do produto usando a empresa fictícia Nordvale Logística. Sem preços, sem planos, sem números inventados.

## Os 5 slides

1. **Capa — a proposta em uma frase.** Fundo creme, logo Rhitmo, título editorial em serifada e uma linha explicando o que a Rhitmo é: um parceiro de liderança nativo em IA que transforma o que já acontece nas conversas em evidência organizada. Rodapé discreto com destinatário (Caju) e data.

2. **O problema e a virada.** Duas colunas: à esquerda, o custo da liderança sem memória (avaliação feita de cabeça, 1:1 sem preparo, contexto que se perde quando alguém muda de time); à direita, as quatro camadas do produto — Pessoas, Evidências, Padrões, Percepções — como sequência visual. Sem estatística de mercado, só a lógica do produto.

3. **Como funciona na prática (parte 1).** Três blocos com captura real ao lado de cada um:
   - **Início** — o dia do líder em uma tela: próximas 1:1s, pauta pronta, pulso do time.
   - **Pessoas** — cada liderado com histórico, ritmo de conversas e sinais de atenção.

4. **Como funciona na prática (parte 2).** Mesmo padrão visual, completando os usos:
   - **Anotações & Evidências** — o que foi dito vira registro datado, com origem (bot, Granola, Slack, texto colado).
   - **Avaliações** — rascunho da avaliação formal citando evidências reais, não memória.
   - **Pergunte à Rhitmo** — a conversa com a IA que responde com base no contexto do próprio time.

5. **Fechamento institucional.** Fundo escuro (roxo-preto da marca), logo Rhitmo centralizado, assinatura da marca e a onda como elemento gráfico. Sem CTA comercial.

## Capturas de tela

Cinco telas reais gravadas no ambiente com a Nordvale Logística: Início, Pessoas, Anotações & Evidências, Avaliações e Pergunte à Rhitmo. Nenhum dado de pessoa real aparece. Calibração fica fora, como você pediu. As imagens entram com cantos arredondados e sombra suave, no mesmo tratamento dos cards do produto.

## Padrão visual

Fundo creme quente (#F5F3EE), superfícies brancas flutuando com sombra difusa, títulos em serifada com tracking apertado, corpo em sans, roxo Rhitmo (#7C3AED) como único acento, labels em caixa alta com tracking largo. Nada de gradiente roxo sobre branco, nada de ícone 3D, nada de linha decorativa sob título.

## Entrega

`rhitmo-proposta-caju.pptx` nos seus arquivos, editável slide a slide. Antes de entregar, converto cada um dos 5 slides em imagem e reviso um por um: texto cortado, sobreposição, contraste, alinhamento das capturas.

## Detalhes técnicos

- Capturas via Playwright em 1600x1000 no ambiente local, com o usuário da demo Nordvale; imagens temporárias em `/tmp/deck/shots/`.
- Deck gerado com pptxgenjs (16:9), cores literais em hex do design system, imagens embutidas em base64.
- QA: `validate_document.py --auto-repair`, `markitdown` para conferir texto, LibreOffice + `pdftoppm` para revisar os 5 slides como imagem.
- Nenhuma alteração no código do produto, no banco ou nas permissões.
