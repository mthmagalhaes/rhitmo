# Avaliação guiada pela cultura: documento formal completo e só valores, para todas as empresas

## O que muda para o líder (qualquer empresa)

1. **Cultura mostra só valores da empresa.** Cartões de "Item da empresa" (como "Dimensões de Performance") deixam de aparecer em qualquer avaliação, nova ou em andamento, e não entram no documento.
2. **Rascunho Geral volta a ser o documento formal completo.** Ao avançar da Cultura, a Rhitmo escreve a avaliação inteira como no rascunho completo: visão geral do período, principais contribuições, padrões observados, uma seção com cada valor da empresa (texto e nível da régua revisados pelo líder), pontos de desenvolvimento, classificação sugerida e próximos passos. Tudo com fontes e datas, sem textos do tipo "complete esta visão geral".
3. Durante a montagem aparece "A Rhitmo está trabalhando nisso", com erro e "Tentar novamente" se falhar. O texto do líder nos cartões é respeitado como base da seção de valores.

## Limpeza dos dados antigos (todas as empresas)

4. Cartões de itens extras já gravados em avaliações **não compartilhadas** são marcados como deixados de fora (não apagados), em todas as empresas, incluindo os 3 da Laís. Avaliações já compartilhadas não mudam.
5. Avaliações guiadas que já foram montadas com o texto simples podem ser refeitas pelo botão "Avançar para Rascunho Geral →".

## Detalhes técnicos

- `_shared/orgContext.ts`: helper único `isAssessableKind` (value/behavior-pai = valor); usado em `init`, `suggest`, `assemble` e leitura de cartões.
- `culture-review-assist` `assemble`: substituir concatenação por chamada à IA (`callAI`, gemini-2.5-flash, escala para pro só se o rascunho completo já usa) com novo modo de alma `soul/modes/culture-guided-assemble.md` (estende `formal-review-draft`, com bloco "🧭 Valores da empresa" alimentado pelos cartões finais) + mesmas evidências do período (`loadPeriodEvidence`) e citações `[doc:UUID]`. Sem prompt inline; regenerar `docs.generated.ts` e snapshots, rodar `loader_test.ts`.
- Filtro de `item_kind = 'custom'` no `init`/`assemble`/`suggest_all` e em `CultureGuidedPanel.tsx` (não renderizar).
- Migration de dados: `update review_culture_items set status='skipped'` onde `item_kind='custom'` e a review não está `shared`/`acknowledged`.
- Validação: testes Deno, deploy de `culture-review-assist`, conferir no navegador a avaliação da Laís (cartões só de valores e Rascunho Geral completo).
