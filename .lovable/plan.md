# Editar texto com o mesmo visual da leitura

## O que muda para o líder
- Ao clicar em "Editar texto", o Rascunho Geral continua com a mesma cara da leitura: mesmas fontes, títulos, espaçamento, fundo e cores da Rhitmo. A área de edição deixa de ficar cinza.
- As citações de evidência aparecem como as mesmas pílulas da leitura, numeradas, e não dá para apagá-las sem querer letra por letra. O líder nunca vê códigos técnicos.
- A barra de formatação (títulos, negrito, itálico, listas) fica discreta, nos tons creme, presa no topo enquanto rola o texto.
- Um contorno roxo suave indica que o modo edição está ligado.

## O que não muda
- Formato salvo da avaliação, citações preservadas ao salvar, Salvar/Cancelar.
- Passos guiados, botão de compartilhar com cadeado e "i", Espelho, PDF, renomear, excluir rascunho.
- Avaliações antigas em HTML continuam abrindo e editando.

## Detalhes técnicos
- `rich-text-editor-impl.tsx`: nova variante `appearance="reading"` (opcional; padrão atual intacto para outros usos) que aplica as mesmas classes `prose` da leitura no conteúdo, remove fundo/borda cinza e usa toolbar sticky com tokens creme.
- Nó Tiptap inline atômico `citation` (attr `docId`) renderizado com o estilo do `CitationChip`; `markdownToEditorHtml` transforma `[doc:UUID]` em `<span data-citation>`; regra do turndown devolve `[doc:UUID]`.
- `FormalReviewSheet.tsx`: usar a variante só no Rascunho Geral.
- Teste em `reviewMarkdown.test.ts`: ida e volta mantém títulos, listas e `[doc:UUID]`.
- Verificação: typecheck, testes e Playwright abrindo uma avaliação, editando, salvando e conferindo citações.
