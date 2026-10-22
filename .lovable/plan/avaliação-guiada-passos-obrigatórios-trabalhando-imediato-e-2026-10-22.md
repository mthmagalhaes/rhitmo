# Avaliação guiada: passos obrigatórios, "trabalhando" imediato e sem invenção

## O que muda para o líder
1. **Passos em ordem na primeira vez**: Cultura → Sinais & Rede → Rascunho Geral → Espelho. As abas seguintes ficam travadas (cadeado + dica "Conclua a Cultura primeiro") até o líder avançar. Depois que o Rascunho Geral é montado, tudo fica livre: o líder edita o texto direto, sem refazer passos.
2. **"Rhitmo está trabalhando" na hora**: ao criar a avaliação guiada, o painel abre já na Cultura com a animação de trabalho, e as sugestões começam sozinhas, sem precisar clicar.
3. **Sem invenção**: quando não houver evidência para um valor, o cartão mostra com naturalidade "Ainda não temos evidência suficiente para este valor neste período, e está tudo bem". Sem nível sugerido nesse caso (hoje sugere "Dentro do esperado"); o líder escolhe se quiser. Sinais do Slack só viram cartão se houver fato real; nada de forçar ligação entre sinais e valores. No Rascunho Geral, valores sem evidência aparecem como "Sem evidência suficiente no período" em vez de texto genérico.

## O que não muda
- Avaliações já existentes (com rascunho montado) abrem livres, como hoje.
- "Rascunho completo", Espelho consultivo, compartilhar, PDF, renomear, revogar, excluir rascunho.
- O liderado continua sem ver cartões de cultura ou sinais.

## Etapas
1. Tela: travar abas pela regra acima; abrir na Cultura e disparar as sugestões automaticamente com a animação.
2. Instruções da Rhitmo: ajustar modos de cultura, sinais e montagem para não inventar e usar a frase acolhedora; regenerar bundle e testes.
3. Servidor: cartão sem evidência salvo sem nível sugerido; montagem trata esses valores como "sem evidência".
4. Verificação: testes, publicação e teste no navegador com uma avaliação de teste (sem compartilhar).

## Detalhes técnicos
- `FormalReviewSheet.tsx`: `stepUnlocked` derivado de `review.content` real (não placeholder) ou estado local de avanço; `TabsTrigger disabled` para signals/draft/mirror enquanto bloqueado; `activeTab` inicial = `culture` quando guiada sem conteúdo.
- `CultureGuidedPanel.tsx`: auto-run `init` + `suggest_all` uma vez (ref guard) quando não há itens; `RhitmoThinking` renderizado no primeiro frame.
- Soul: `culture-guided-item.md` (remover nível conservador quando `insufficient_evidence`), `culture-guided-signals.md` (zero cartões é resposta válida; nunca relacionar a valores sem fato), `culture-guided-assemble.md`; rodar `regen-docs`, `regen-snapshots`, `loader_test`.
- `culture-review-assist`: com `insufficient_evidence`, gravar `suggested_level = null`; deploy da função.
