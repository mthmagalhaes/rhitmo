## Objetivo

Remover Objetivos da navegação e dos pontos de entrada visíveis ao usuário, **sem apagar dados, tabela `goals`, RLS, hooks ou edge functions**. Reversível em minutos (basta reativar o item de menu e a rota).

## O que muda (UI apenas)

1. **Sidebar do líder** — `src/lib/navigation.ts`
   - Comentar (não deletar) o item `objetivos` em `LEADER_NAV_ITEMS`, deixando um comentário "oculto enquanto repensamos a feature; rota e dados continuam vivos".

2. **Rota** — `src/App.tsx`
   - Comentar a rota `/lider/objetivos` e o import de `LiderObjetivos`. Se alguém digitar a URL, cai no `NotFound` (que já redireciona pro home da persona).

3. **Pontos de entrada para Objetivos dentro de outras telas**
   - `src/components/leader/MemberAdminSheet.tsx` (linha 260): remover o link "Objetivos" do menu de atalhos do sheet do liderado.
   - Nenhum outro CTA visível precisa mexer (a menção em `MembersGrid.tsx:53` é só um comentário de código; `MemberDetails.tsx:779` usa a palavra "objetivos" para itens de PDI, não para a feature Goals).

4. **Insight "destrava PDI e Avaliação Formal"**
   - Não precisa editar nada: o componente `GoalsCoverageInsight` só aparece em `/lider/objetivos`, que estará oculta. A copy enganosa some junto.

## O que **NÃO** muda

- Tabela `goals`, RLS, policies, GRANTs — intactas.
- Hooks (`useTeamGoalsSummary`), componentes (`GoalsManager`, `GoalCard`, `NewGoalDialog`, `GoalsCrossMemberTable`, `GoalsCoverageInsight`, `GoalsMemberSheet`) — ficam no repositório, sem uso, prontos para reativar.
- Edge functions que leem `goals` no contexto de IA (`chat-mentor`, `generate-review`, `generate-nudges`, `mirror-weekly`, `meu-rhitmo`, `analyze-feedback*`) — **continuam consumindo** os dados existentes. Se a tabela estiver vazia para a maioria, o impacto é nulo; para quem já cadastrou metas, a IA segue usando como sinal silencioso.
- i18n keys de `nav.lider.objetivos` — ficam nos JSON, sem custo.

## Validação

- `/lider/inicio` → sidebar mostra: Início, Pessoas, Diário, Avaliações (sem Objetivos).
- `/lider/objetivos` digitado na URL → cai em `NotFound` → redireciona pro home.
- Sheet de liderado (`MemberAdminSheet`) → menu de atalhos sem "Objetivos".
- Brief / Mentor / Review continuam funcionando (não dependem de UI).

## Reverter no futuro

Descomentar 3 blocos (nav item, rota+import, link no MemberAdminSheet). Sem migração, sem backfill.

## Memória

Atualizar `mem://index.md` com uma linha em Core: "Objetivos (Goals) está oculto da UI desde jun/2026 — schema, hooks e consumo por IA continuam vivos. Não re-adicionar ao menu sem decisão de produto."
