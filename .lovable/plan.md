
Objetivo: alinhar horizontalmente os botões CTA dos cards de pricing sem perder o visual premium da landing.

Diagnóstico
- O problema não está no componente `Button`.
- Em `src/pages/Landing.tsx`, cada card tem alturas diferentes acima do CTA:
  - subtítulos com tamanhos diferentes
  - badges opcionais (`Preço de Lançamento`, `Enterprise`)
  - blocos de preço/nota com alturas diferentes
- Como o CTA vem antes da lista de features, qualquer variação nesses blocos empurra o botão para baixo ou para cima.

Plano de implementação
1. Reestruturar a anatomia de cada pricing card em slots consistentes:
   - faixa superior para badge/eyebrow
   - bloco de título + subtítulo
   - bloco de preço + nota
   - CTA
   - lista de features

2. Normalizar as alturas dos slots acima do CTA no desktop:
   - aplicar `min-h` responsivo nos blocos de badge, descrição e preço
   - usar placeholder invisível quando o card não tiver badge, para reservar a mesma altura visual
   - garantir `h-full` em todos os cards, não só no Pro

3. Padronizar o espaçamento vertical:
   - trocar `mb-*` soltos por um ritmo único com `gap`/wrappers consistentes
   - manter o CTA com a mesma altura visual em todos os cards
   - preservar bordas arredondadas, sombra suave e hierarquia visual atual

4. Ajustar responsividade sem engessar mobile:
   - aplicar a equalização principalmente em `md/xl`, onde os cards ficam lado a lado
   - no mobile, manter empilhamento natural sem espaços artificiais excessivos

5. Revisar o resultado visual:
   - confirmar alinhamento dos CTAs nas versões 2 colunas e 4 colunas
   - conferir PT/EN, porque os textos em inglês também podem alterar a altura dos blocos

Detalhe técnico
- Arquivo principal: `src/pages/Landing.tsx`
- Mudança esperada: refatorar os cards para usar wrappers internos com alturas mínimas consistentes, em vez de depender do fluxo atual com `mb-4`, `mb-6` e blocos variáveis acima do botão.
