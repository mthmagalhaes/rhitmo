# Avaliações: tirar o "pisca" da lista ao abrir

## O que acontece
Ao abrir Avaliações, a tabela aparece antes de chegarem as datas das últimas avaliações de cada liderado. Nesse meio tempo, o filtro padrão "Sem Formal 6m+" trata todo mundo como "nunca avaliado", então mostra **todos** os liderados. Milissegundos depois, as datas chegam: quem foi avaliado recentemente some, a ordem muda e os números dos filtros pulam. É isso que você vê como uma lista rápida antes da tela final.

## Correção
- Enquanto as datas não chegam, a tabela mostra linhas-esqueleto (cinza, no formato das linhas reais) em vez dos nomes, e os números dos filtros ficam ocultos.
- Quando os dados chegam, as linhas entram de uma vez, com um fade curto, já filtradas e na ordem certa.
- O cartão de cobertura abaixo da tabela segue a mesma regra (não mostra contagem provisória).
- Aproveitar o aquecimento de dados que já existe ao passar o mouse no menu: incluir também essas datas, para que, na maioria das vezes, a tabela já abra pronta, sem esqueleto.
- Nada muda no filtro, nos botões ou na abertura deslizante do liderado.

## Detalhes técnicos
- `useTeamReviewsSummary` já retorna `isLoading`; passar para `ReviewsCrossMemberTable` e `ReviewsCoverageInsight` (prop `loading`). Também considerar `useLeaderMembers().isLoading`.
- Na tabela: com `loading`, renderizar 4 linhas skeleton e esconder contadores dos chips; sem loading, `motion` fade (respeitando `useReducedMotion`).
- `routeDataPrefetch.ts`: para `/lider/avaliacoes`, após aquecer liderados, `prefetchQuery` das duas queries do resumo, exportando seus builders de `useTeamReviewsSummary` (mesmas chaves).
- Verificação: Playwright logado abrindo /lider/avaliacoes, capturas em sequência rápida para confirmar ausência da lista provisória.
