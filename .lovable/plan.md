# Compartilhar avaliação: Espelho avisa, nunca trava

## O que acontece hoje
- Ao clicar em "Compartilhar com Liderado", o Espelho revisa o texto. Se houver alertas médios ou altos, ele leva você para a aba Espelho e para por aí.
- Quando você clica em "Usar sugestão no texto", o texto muda. No clique seguinte em Compartilhar, o Espelho revisa de novo e pode trazer alertas novos. É isso que vira um ciclo sem saída.
- Não existe um botão claro de "compartilhar mesmo assim". Também não fica claro se a avaliação já foi compartilhada ou não.

## O que vou mudar
1. **Compartilhar sempre possível:** se o Espelho encontrar pontos, aparece uma janela de confirmação com o resumo ("3 pontos em aberto") e dois botões: "Revisar no Espelho" e "Compartilhar mesmo assim". O Espelho continua avisando, mas nunca bloqueia.
2. **Sem revisões repetidas:** depois que o Espelho revisou o texto uma vez, ele não revisa de novo sozinho ao compartilhar, mesmo que você tenha aplicado sugestões. Se quiser, "Revisar de novo" continua disponível na aba.
3. **Botão de compartilhar na aba Espelho:** quando você estiver no Espelho, o rodapé mostra "Compartilhar com Liderado". Assim, depois de ignorar ou aceitar os pontos, você compartilha dali mesmo.
4. **Aplicar sugestão salva junto:** ao compartilhar, o texto com as sugestões aceitas é o que vai para o liderado (já acontece hoje, só passa a ficar explícito no aviso).
5. **Status visível:** depois de compartilhar, aviso "Compartilhada com Laís" e o selo muda para "Enviada" na hora. Na lista, a avaliação aparece como compartilhada.
6. **Rascunho da Laís:** removo a frase interna que vazou ("Reescreva removendo a instrução de edição: ...") no tópico "Otimização e agilidade no fluxo de POCs", sem mudar o resto do texto.

## O que não muda
- Cultura → Rascunho Geral → Espelho, Renomear, PDF, Revogar acesso, Excluir rascunho.
- O Espelho continua invisível para o liderado.
- Avaliações já compartilhadas ficam como estão.

## Detalhes técnicos
- `FormalReviewSheet.tsx` / `handleShareClick`: roda `runMirror` só se nunca houve revisão (`!mirrorResult`); com pendências abre um `AlertDialog` (Revisar / Compartilhar mesmo assim → `setShareDialogOpen(true)`); sem pendências abre direto o `ShareReviewDialog`.
- Rodapé: botão Compartilhar visível também em `activeTab === 'mirror'`; `onSuccess` do `sendMutation` invalida `formal-review`, `performance-reviews`, `team-performance-reviews` e mostra toast com o nome do liderado.
- Dados: `update performance_reviews set content = replace(...)` apenas para o rascunho Q3/2026 da Laís, removendo a frase vazada.
- Verificação: Playwright abrindo o rascunho, aplicando/ignorando alertas e confirmando que "Compartilhar mesmo assim" abre a confirmação final (sem confirmar o envio real para a Laís).
