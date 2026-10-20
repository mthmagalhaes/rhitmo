# Excluir avaliações formais em rascunho

## O que muda para o líder
- No painel da avaliação formal aparece um botão discreto "Excluir rascunho" (lixeira), só enquanto a avaliação está em rascunho.
- Na lista de avaliações do liderado, as linhas da seção "Em rascunho" ganham uma lixeira que aparece ao passar o mouse.
- Os dois pedem confirmação: "Excluir este rascunho? Esta ação não pode ser desfeita."
- Depois de excluir: a linha sai da lista com animação, o painel fecha e o card "Próximo ciclo" e a cobertura do time são recalculados na hora.
- Avaliações compartilhadas ou confirmadas: nenhum botão de excluir (histórico oficial).

## Regras
- Só pode excluir quem criou a avaliação (o líder dono).
- Só se ainda não foi compartilhada nem confirmada.
- A regra vale também no servidor, não apenas na tela: mesmo forçando, uma avaliação compartilhada não é apagada.

## O que não quebra
- O botão "Excluir" que já existe nas avaliações não formais (diálogo antigo) continua igual.
- Cartões de cultura, Espelho e pares ligados ao rascunho são apagados junto (já configurado assim no banco).
- Liderado, RH e avaliações compartilhadas não são afetados.

## Detalhes técnicos
1. Primeiro passo: consultar as políticas atuais de exclusão de `performance_reviews` e todas as FKs que apontam para ela, para confirmar que nenhuma tabela bloqueia o delete (sem CASCADE/SET NULL).
2. Migration (se necessário): política DELETE restrita a `manager_id = effective_user_id()` AND `shared_with_member = false` AND `acknowledged_at IS NULL`; se a política atual for mais ampla para formais, substituir pela restrita mantendo o comportamento do diálogo antigo (que também só exclui rascunhos ou mantém o atual, conforme a consulta). FKs sem cascade recebem `ON DELETE CASCADE` ou `SET NULL` conforme o caso.
3. `FormalReviewSheet.tsx`: botão + AlertDialog, delete com `.eq('shared_with_member', false)`, checagem de linhas afetadas, toast de erro amigável, `onDeleted` callback.
4. `PerformanceReviewList.tsx`: lixeira na linha de rascunho (stopPropagation), AlertDialog, remoção otimista com rollback em falha.
5. Invalidar `performance-reviews` e o resumo do time (`useTeamReviewsSummary`) em `Avaliacoes.tsx` e `ReviewsMemberDetail`.
6. Verificar no navegador com a conta do líder: excluir um rascunho de teste e confirmar que compartilhadas não exibem o botão.
