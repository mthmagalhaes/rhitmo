# Avaliações antigas com leitura limpa

## O que muda para o líder
- Avaliações antigas (como Q1/2026 da Laís), salvas num formato diferente, deixam de mostrar marcas soltas no texto e passam a aparecer com títulos, parágrafos e listas organizados, igual às novas.
- O PDF dessas avaliações também sai limpo.
- Nada é alterado no banco: só a forma de exibir.

## O que não muda
- Status (Rascunho, Compartilhada, Confirmada), conteúdo, citações e fluxo de compartilhamento.
- Avaliações novas continuam exibindo igual.

## Detalhes técnicos
- `FormalReviewSheet.tsx` (aba Rascunho Geral, modo leitura): se `isHtml(draftText)` (ou contém tags de bloco), renderizar `DOMPurify.sanitize` em `div` com classes `prose` iguais às do Markdown; senão, manter `ReactMarkdown` atual.
- Nova função `normalizeLegacyReviewHtml(html)` em `reviewMarkdown.ts`: `<p><strong>Título</strong></p>` sozinho vira `<h3>`; remove `<p>` vazios; aplicada na leitura, no editor e em `printReview.ts`.
- `ReviewViewDialog.tsx`: usar a mesma normalização no ramo HTML.
- Teste bun: HTML legado vira títulos e parágrafos, Markdown não é afetado.
- Verificação: Playwright abrindo Q1/2026 da Laís.
