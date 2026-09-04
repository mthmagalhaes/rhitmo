# Mapa visual da rede (ONA) — grafo + pessoas-chave

Hoje a aba "Rede" mostra a colaboração como listas com barrinhas. O que existe por trás já é um grafo (pares de pessoas com peso e número de eventos, em janelas de 30/60/90 dias), só falta desenhá-lo e extrair dele as pessoas que sustentam a rede.

Vamos entregar duas telas com o mesmo componente:

- **Mapa do time** — dentro de Anotações & Evidências > Rede, para cada líder ver os seus liderados e com quem eles trabalham.
- **Mapa da empresa** — nova aba na área de RH, com todos os times coloridos por líder, no espírito do que a Windmill mostra.

## O que o usuário vai ver

1. **Grafo de bolinhas e linhas.** Cada pessoa é um ponto; cada linha é uma relação de trabalho real, mais grossa quando a colaboração é mais intensa. O ponto cresce conforme a pessoa está mais conectada. Cor por time (na visão de RH) ou por "meu liderado / fora do time" (na visão do líder). Passar o mouse acende a pessoa e as conexões dela; clicar abre um painel lateral com com quem ela mais trabalha e quando foi a última interação.
2. **Busca e filtros.** Campo "Buscar pessoa" que centraliza e destaca alguém, seletor de janela (30/60/90 dias) e, na visão de RH, filtro por time.
3. **Resumo da rede.** Pessoas, relações, média de conexões por pessoa e quantos grupos separados existem (pessoas que não se conectam a ninguém do resto).
4. **Pessoas-chave**, em três blocos, com a definição que o artigo da Windmill usa:
   - *Mais conectadas* — quem tem mais relações de trabalho ativas.
   - *Conectores críticos* — quem está no caminho entre grupos que, sem essa pessoa, deixariam de se falar (betweenness). É o alerta de "se essa pessoa sai, duas partes da empresa perdem contato".
   - *Pontes entre times* — quem mais colabora fora do próprio time.
   - Na visão de RH também: *Influência* (eigenvector, o "PageRank" das pessoas) e *Na periferia*, quem está conectado a pouquíssima gente.
5. **Sinais** (isolamento, queda, concentração) continuam onde estão, agora ligados ao mapa: clicar no sinal destaca a pessoa no grafo.

Privacidade mantida: nenhuma mensagem, assunto ou conteúdo aparece — só a existência e a intensidade da colaboração. O líder segue vendo apenas pares que ele já pode ver; a visão da empresa inteira fica restrita a HR Admin, Owner e Super Admin.

## Detalhes técnicos

**Dados**
- `team_network_edges` já é por workspace e por janela; nenhuma migração de estrutura nova é necessária para o grafo.
- Nova RPC `get_workspace_network(_window_days)` — SECURITY DEFINER, retorna todas as arestas do workspace mais `team_id`, nome do time e nome do líder para colorir; guarda de acesso `is_hr_admin_of_workspace(...) OR is_workspace_owner(...) OR is_admin()`; `REVOKE ... FROM anon` + `GRANT EXECUTE TO authenticated, service_role`; `_assert_rpc_runs` no fim da migração.
- `get_team_network` ganha `team_id`/`team_name` nas colunas para o mesmo esquema de cores; limite sobe de 300 para 600 arestas.
- Sem migração destrutiva.

**Cálculo das métricas** — feito no cliente, sobre as arestas já carregadas (escala esperada: dezenas a poucas centenas de nós):
- novo `src/lib/networkMetrics.ts`: `buildGraph(edges)`, `degreeRank`, `betweennessRank` (Brandes ponderado), `eigenvectorRank` (power iteration, 50 iterações), `crossTeamRank`, `componentCount`, `peripheral`.
- testes unitários simples em `src/lib/networkMetrics.test.ts` com um grafo de barbell para validar broker/hub.

**Renderização**
- `bun add d3-force d3-scale` (+ `@types/d3-force`). Layout força-dirigida em worker-less `requestAnimationFrame`, com ~300 ticks pré-calculados e depois congelado; render em SVG para permitir hover/clique acessível. Sem novas libs de grafo pesadas (nada de cytoscape/reactflow).
- `src/components/network/NetworkGraph.tsx` — componente puro (`nodes`, `links`, `colorBy`, `highlightId`, `onSelect`), responsivo via `ResizeObserver`, respeitando `prefers-reduced-motion` (pula a animação e já entra estabilizado).
- `src/components/network/KeyPeopleCards.tsx` — os blocos de pessoas-chave, com tooltip explicando cada definição em linguagem simples.
- `src/components/network/NetworkSummary.tsx` — o resumo numérico.
- Estilo creme/bento: `rounded-2xl`/`rounded-3xl`, sombras difusas, cores dos nós a partir de tokens semânticos do design system (nada de hex fixo em componente).

**Telas**
- `src/components/context/NetworkTab.tsx`: passa a abrir com o grafo no topo, sinais ao lado, listas atuais viram o painel de detalhe da pessoa selecionada.
- `src/hooks/useTeamNetwork.ts`: novo `useWorkspaceNetwork(windowDays)` para a RPC de RH.
- Nova página `src/pages/hr/Rede.tsx` + rota `/hr/rede` em `src/lib/routeLoaders.ts` e `src/App.tsx`, item de menu em `src/lib/navigation.ts` (bloco HR) e chaves `nav.hr.rede` nos três locales.

**Ordem de execução**
1. Migração (`get_workspace_network` + colunas de time em `get_team_network`).
2. `networkMetrics.ts` + testes.
3. `NetworkGraph` + cards de pessoas-chave + resumo.
4. Religar a aba Rede do líder sobre os novos componentes.
5. Página `/hr/rede` + rota/menu/i18n.
6. Rodar o linter de segurança e conferir a build.
