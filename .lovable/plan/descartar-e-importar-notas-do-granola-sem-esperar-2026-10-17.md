# Descartar e importar notas do Granola sem esperar

## Por que demora 4-5 segundos hoje
Quando você clica no X de uma nota no painel "Importar do Granola", a tela não muda nada até duas idas ao servidor terminarem, uma depois da outra:
1. A Rhitmo grava que a nota foi descartada (~1s).
2. Depois, recarrega a lista inteira de notas. Para isso, consulta o Granola de novo e reconfere as notas sem dono (~3-4s).

Só então o cartão some. Ele some de uma vez: não há animação nem nenhum sinal de que o clique funcionou. Importar, mover e retirar uma nota funcionam do mesmo jeito.

## O que muda
- **Resposta instantânea:** o cartão sai deslizando para o lado e encolhe assim que você clica. Os cartões de baixo sobem suavemente para ocupar o espaço.
- **Importar:** a nota sai da lista e já fica marcada como "Em <liderado>", sem esperar o servidor.
- **Contadores atualizados na hora:** o aviso "15 notas do Granola esperando…" diminui no mesmo instante.
- **Desfazer:** depois de descartar, um aviso "Nota descartada · Desfazer" fica alguns segundos na tela. Quem clicou sem querer recupera a nota.
- **Se o servidor falhar:** o cartão volta para onde estava, com a mensagem de erro de sempre. Nada se perde.
- **Sem consulta extra ao Granola a cada clique:** a lista se reconcilia com o servidor em segundo plano, sem travar a tela.
- **Movimento reduzido:** quem ativou essa opção no computador vê a nota sumir sem animação.

Nada muda na regra de quem vê o quê nem no que é salvo: a mesma ação no servidor continua sendo chamada.

## Detalhes técnicos
- `src/hooks/useNoteTaker.ts`: `dismiss`, `assign`, `remove`, `reassign` ganham `onMutate` com atualização otimista em `['note-taker-recent', provider]` (status `dismissed`/`imported` ou member trocado) e no `pendingKey` (remove o id). Snapshot e rollback em `onError`. `onSettled` invalida com `refetchType: 'none'` na lista recente, para não chamar `list_recent` → Granola a cada clique. Os demais caches (`feedbacks`, `diario-feedbacks`) continuam invalidados normalmente.
- `list_recent` deixa de invalidar `pendingKey` dentro do `queryFn` (isso disparava outra chamada a cada refetch). A invalidação passa a acontecer só ao abrir o painel.
- `ImportFromNoteTakerSheet.tsx`: a lista vira `AnimatePresence` + `motion.div layout`, com saída `x: 40, opacity 0, height 0` em ~220ms e curva `[0.22,1,0.36,1]`, respeitando `useReducedMotion`. O toast de descarte ganha a ação "Desfazer", que chama o mesmo endpoint para restaurar se ele já existir; se não existir, só restaura a nota no cache local e cancela o descarte. O suporte a restaurar no backend será confirmado antes da implementação; se não houver, o "Desfazer" adia o envio do descarte por 5s em vez de chamar o servidor na hora.
- `PendingNotesBanner` lê o mesmo cache e atualiza sozinho.
- Verificação: Playwright no painel com sessão real, medindo o tempo entre o clique e a saída do cartão (meta: menos de 100ms) e confirmando que nenhuma chamada `list_recent` sai no clique.
