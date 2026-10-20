# Avaliação formal: tela maior e editor igual à leitura

## O que muda para o líder
1. **Tela maior**: a avaliação formal deixa de abrir no canto direito e abre como um painel amplo e centralizado (quase a tela toda, cantos arredondados, entrada suave que respeita "movimento reduzido"). Cultura, Rascunho Geral e Espelho ganham espaço de leitura.
2. **Editar como se lê**: ao clicar em "Editar texto", o Rascunho Geral aparece já formatado (títulos, parágrafos com respiro, marcadores, negrito, itálico), com barra de ferramentas visível. Ao salvar, o texto volta ao formato atual, mantendo as citações de evidência intactas.

## O que não muda
- Dados, cartões de cultura aceitos, Espelho, exclusão de rascunho, compartilhar e confirmar.
- Fluxo Cultura → Rascunho Geral → Espelho e montagem automática.
- Avaliações já salvas continuam abrindo e exibindo igual.

## Detalhes técnicos
- `FormalReviewSheet.tsx`: trocar o container `Sheet side="right" sm:max-w-3xl` por `Dialog` largo (`max-w-[1200px] w-[94vw] h-[92vh] rounded-3xl`, conteúdo com scroll interno); props e API externas iguais, então `Avaliacoes.tsx`, `PerformanceReviewList` e demais chamadores não mudam.
- Edição: converter Markdown → HTML com `marked` ao entrar no modo edição; citações `[doc:UUID]` viram um span não editável (nó Tiptap inline `citation`) para não se perderem; ao salvar, HTML → Markdown com `turndown` (regra própria devolvendo `[doc:UUID]`). Conteúdo legado já em HTML é detectado e carregado direto.
- `rich-text-editor-impl.tsx`: adicionar o nó de citação e estilos `prose` no editor para espelhar a leitura; toolbar com títulos, negrito, itálico, listas.
- Teste unitário de ida e volta Markdown ↔ HTML garantindo que títulos, listas e `[doc:UUID]` sobrevivem.
- Verificação: typecheck e Playwright abrindo a avaliação da Laís, editando, salvando e conferindo citações.
