# Corrigir erro ao "Avançar para Rascunho Geral"

## Causa (confirmada nos registros do servidor)
Ao montar o Rascunho Geral, o servidor procura as instruções da Rhitmo para essa etapa ("culture-guided-assemble") e não encontra: o arquivo foi criado, mas não entrou no pacote de instruções que é publicado junto com a função. Por isso a montagem falha para qualquer avaliação guiada pela cultura, não só a da Laís. As sugestões por valor funcionam porque as instruções delas estão no pacote.

## Correção
1. Adicionar `modes/culture-guided-assemble.md` à lista de arquivos do gerador do pacote de instruções.
2. Regenerar o pacote (`docs.generated.ts`) e rodar os testes de paridade da alma existentes.
3. Republicar `culture-review-assist` (e as demais funções que usam o pacote, para ficarem com a mesma versão).
4. Adicionar um teste que falha se algum `.md` em `soul/modes` ou `soul/channels` ficar fora do pacote, para o erro não voltar.
5. Verificar chamando a montagem e conferindo os registros sem o erro.

Nada muda na tela, nos cartões aceitos nem nas avaliações existentes; os valores já aceitos da Laís continuam salvos e basta clicar de novo no botão.
