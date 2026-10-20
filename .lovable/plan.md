# Rascunho Geral: títulos limpos e negrito correto no PDF

## O que muda para o líder
1. **Títulos dos valores sem texto grudado**: quando a IA escrevia o título do valor e o parágrafo inteiro na mesma linha, tudo saía em negrito. Agora o título fica numa linha ("Parceria — Atende as expectativas") e o texto vira um parágrafo normal embaixo.
2. **PDF com o mesmo visual da tela**: títulos com peso moderado e o negrito só onde ele existe de fato.
3. **Rascunho da Laís corrigido**: o documento atual (jul–set) é ajustado uma vez, sem mudar nenhuma palavra.

## O que não muda
- Conteúdo, citações `[doc:UUID]`, níveis da régua, fluxo Cultura → Rascunho Geral → Espelho.
- Avaliações compartilhadas ou confirmadas não são alteradas no banco (a correção visual vale para elas só na exibição e no PDF).

## Detalhes técnicos
- Nova função `normalizeReviewHeadings(md)` em `src/lib/reviewMarkdown.ts`: para linhas `#{2,4}` com mais de ~90 caracteres, separa no primeiro ponto final após " — Nível" (ou após o travessão + nível) em título + parágrafo. Idempotente.
- Aplicar na exibição do Rascunho Geral, em `markdownToEditorHtml` e em `printReview.ts`.
- Backend: mesma normalização em `culture-review-assist` (assemble) antes de salvar; reforço em `soul/modes/culture-guided-assemble.md` ("título sozinho na linha, texto no parágrafo seguinte"), seguido de regen-docs, regen-snapshots, testes soul e deploy.
- `printReview.ts`: `h2,h3{font-weight:600}`.
- Correção única do rascunho atual da Laís via UPDATE com o texto normalizado (só `shared_with_member=false`).
- Testes bun: normalização separa título longo, mantém título curto, preserva citações e é idempotente.
