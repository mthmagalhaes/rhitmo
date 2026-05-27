## Objetivo

Owner que também é líder (ex.: Matheus em Faster Ops) deve enxergar em `/lider/*` apenas os liderados dos times onde ele é `leader_user_id`. Visão de workspace inteiro só em `/workspace/*`.

## Mudanças

### 1. `src/hooks/useLeaderMembers.ts` — escopo estrito de líder

Hoje resolve workspace por `owner_id` OR liderança, e lista TODOS os times/membros do workspace. Passa a:

- **workspace**: resolver só via `teams.leader_user_id = effectiveUserId` (remove branch `owner_id`). Sem times liderados → `workspace = null` → páginas mostram empty state.
- **teams**: `.eq('workspace_id', ws.id).eq('leader_user_id', effectiveUserId)`.
- **members**: `.in('team_id', teamIds)` (lista derivada dos times filtrados), em vez de join por `workspace_id`.
- Renomear queryKeys para `workspace-leader-scope`, `teams-leader-scope`, `team-members-leader-scope` para não colidir com caches antigos.

Efeito para Matheus: vê só Business Ops, CreativeOps, Customer Success, Expansão e seus 6 liderados. Lucas/Vinicius (Comercial — Caio) somem de `/lider/pessoas`, `/lider/diario`, `/lider/objetivos`, `/lider/1on1s`. Os insights ("X sem nota recente", "X sem metas") recalculam sozinhos.

### 2. `src/pages/lider/Pessoas.tsx` — remover aba Times

- Remover o item `value: 'times'` do array `tabs` (e o botão "Adicionar time" se ainda existir no header).
- `TeamsTab` continua definido no arquivo (reaproveitado por `/workspace/teams`).
- Aba Convites e Analytics permanecem com `hidden: !canManageTeams` como hoje.

### 3. Memória

Atualizar `mem://architecture/papeis-e-permissoes` com a regra: "`/lider/*` é estritamente leader-scoped; Owner não-líder não enxerga nada lá. Visão de workspace mora em `/workspace/*`."

## Fora de escopo

- UI dedicada de `/workspace/teams` (hoje redireciona para `/hr/teams`, que já tem o CRUD completo).
- Toggle "Vendo como Líder | Owner" dentro de `/lider/*`.
- Banner one-time avisando outros Owners.
- Mudanças em RLS (já feitas na migration anterior).

## Validação

- Logado como Matheus (Owner + líder de 4 times): `/lider/pessoas` mostra 6 liderados; aba Times desaparece; `/lider/diario` e `/lider/objetivos` recalculam insights para a base reduzida.
- Logado como Caio (líder de Comercial, não-Owner): comportamento inalterado (continua vendo Lucas/Vinicius).
- Acesso pleno ao workspace continua disponível via "Visão do workspace" no switcher → `/workspace/people`.
