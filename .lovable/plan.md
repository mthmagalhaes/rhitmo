# Avaliação formal: ações completas, botões sem sobreposição e Q2 da Laís

## O que encontrei
1. **Ações sumiram nas novas avaliações**: as antigas (ex.: Q4/2025) abrem no painel clássico, com Revogar acesso, Exportar PDF, Editar (renomear) e Excluir no topo. As novas (guiadas pela cultura) abrem no painel grande novo, que só tem Fechar, Excluir rascunho, Salvar e Compartilhar/Remover compartilhamento no rodapé. Não há renomear nem PDF.
2. **Botões sobrepostos**:
   - O botão "Avançar para Rascunho Geral" flutua por cima do rodapé (Fechar / Salvar / Compartilhar ficam escondidos atrás).
   - O "X" de fechar fica em cima do selo "Rascunho".
   - No painel clássico, o "X" encosta no botão "Excluir".
3. **Q2/2026 da Laís**: não existe nenhuma avaliação Q2/2026 da Laís no banco (nem rascunho, nem compartilhada). Ela tem só Q4/2025 (compartilhada), Q1/2026 (confirmada) e o rascunho atual de jul-set. Gabriela, Giovanna, Yasmin e Guilherme têm Q2 compartilhada. Hoje cedo a lista da Laís mostrava "Avaliação Q2/2026" em **rascunho** (não compartilhada); ela foi excluída depois que liberamos a exclusão de rascunhos. Ou seja: ela nunca chegou a ser enviada para a Laís, e não há como recuperá-la pela plataforma.

## O que vou fazer
1. **Barra de ações no topo do painel novo** (mesmo padrão do clássico, alinhada à direita, abaixo do X, sem colidir):
   - Renomear (edita o título na hora).
   - Exportar PDF (usa o Rascunho Geral formatado, com as mesmas dicas ocultas na impressão).
   - Revogar acesso (só quando compartilhada; substitui o "Remover compartilhamento" do rodapé).
   - Excluir rascunho (só em rascunho; sai do rodapé).
2. **Rodapé limpo**: Fechar à esquerda; Salvar rascunho + Compartilhar à direita. O "Avançar para Rascunho Geral" passa a ser o botão principal do rodapé enquanto se está na aba Cultura, em vez de flutuar por cima.
3. **Cabeçalho**: selo de status ao lado do título, longe do X. No painel clássico, espaço reservado para o X não encostar no "Excluir".
4. **Q2 da Laís**: nada a corrigir no código. Sugestão: gerar uma nova avaliação de abr-jun 2026 para ela. Para evitar perda acidental no futuro, a confirmação de exclusão passa a mostrar o título e o período do rascunho.

## O que não muda
- Fluxo Cultura → Rascunho Geral → Espelho, editor formatado, dados e regras de quem pode excluir (só rascunhos).
- Avaliações antigas continuam abrindo no painel clássico.

## Detalhes técnicos
- `FormalReviewSheet.tsx`: header com `pr-12` e badge inline ao título; toolbar com `Input` inline para título (`update performance_reviews.title`), Exportar PDF via `window.print()` com stylesheet de impressão do conteúdo do rascunho (mesma abordagem do `ReviewViewDialog`), revogar reaproveitando `unshareMutation`, `DeleteDraftReviewButton` movido para a toolbar.
- `CultureGuidedPanel.tsx`: remover o CTA flutuante (sticky/absolute) e expor callback para o rodapé do sheet renderizar o CTA quando `activeTab === 'culture'`.
- `ReviewViewDialog.tsx`: `pr-10` na linha de ações para afastar o X.
- `DeleteDraftReviewButton.tsx`: confirmação inclui título/período (prop opcional).
- Verificação: typecheck e Playwright abrindo o rascunho da Laís em 1280px e 603px de largura, conferindo que nenhum botão se sobrepõe, renomear salva, PDF abre o diálogo de impressão.
