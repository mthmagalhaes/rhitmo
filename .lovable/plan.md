## Sprint 8.3 — Página `/contexto` (Feed Universal do Context Graph)

Página unificada onde o líder vê todas as evidências de toda a equipe em ordem cronológica reversa, com filtros por liderado e por fonte. Cada item abre o `EvidenceDrawer` já existente.

### Diretriz de estabilidade aplicada

Antes de codar, mapeei a arquitetura. Identifiquei dois pontos onde seguir o briefing literal causaria fricção e proponho ajustes:

1. **`useContextTimeline` é por-membro** (RPC `get_member_timeline(_member_id)`). Carregar a timeline do time em cima desse hook obrigaria N requisições paralelas (uma por liderado), N+1 com membros novos sendo adicionados, e perderíamos a ordenação correta nas bordas. **Proposta:** criar uma RPC nova `get_team_timeline` que devolve evidências de todos os membros visíveis ao usuário em uma única query, com paginação por cursor (`occurred_at`). Mais barato e mais rápido. O hook por-membro de 8.1 segue intacto para os outros consumidores.

2. **A sidebar do líder hoje tem 5 itens + Configurações** (regra documentada no `navigation.ts`). Adicionar "Contexto" estoura o limite. **Proposta:** adicionar como 6º item antes de Configurações (Configurações continua sendo a última). Mantém a hierarquia visual e a regra de "Settings sempre por último".

3. **Reuso máximo:** `EvidenceDrawer`, `getSourceMeta`, `useEvidenceById` e o evento global `rhitmo:open-evidence` (entregues no 8.2) são reaproveitados sem alteração. Card clicável dispara o mesmo evento → drawer abre.

### Backend (1 migration)

**Nova RPC `get_team_timeline`** — retorna evidências de todos os `team_members` para os quais `effective_user_id()` é líder, owner ou HR Admin do workspace.

```text
get_team_timeline(
  _workspace_id uuid DEFAULT NULL,   -- opcional; quando NULL usa o workspace ativo
  _member_ids uuid[] DEFAULT NULL,    -- filtro: lista de liderados (NULL = todos)
  _source_tables text[] DEFAULT NULL, -- filtro: ['feedbacks','meeting_transcripts',...]
  _before timestamptz DEFAULT NULL,   -- cursor: traz evidências com occurred_at < _before
  _limit int DEFAULT 30
) RETURNS TABLE (
  id, member_id, member_name, member_avatar,  -- join leve em team_members
  evidence_type, source_table, source_id,
  occurred_at, title, summary, sentiment,
  visibility, metadata
)
```

- `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public`.
- Autorização replicada do `get_member_timeline`: workspace owner/HR/líder ou liderado vendo a si mesmo. Liderado só vê o próprio member_id.
- Performance: `WHERE ce.member_id = ANY(allowed_member_ids) AND occurred_at < COALESCE(_before, now()) ORDER BY occurred_at DESC LIMIT _limit`. Já existe índice `(member_id, occurred_at DESC)`.
- `GRANT EXECUTE ... TO authenticated`.

### Frontend

**Arquivos novos:**

- `src/hooks/useTeamTimeline.ts` — `useInfiniteQuery` que chama a nova RPC. Aceita `{ memberIds?, sourceTables?, pageSize? }`. Cursor = `occurred_at` do último item.
- `src/components/context/EvidenceCard.tsx` — card clicável que dispara `openEvidence(docId)`. Layout: avatar + nome do liderado, badge de fonte (via `getSourceMeta`), título, snippet do summary (2 linhas, `line-clamp-2`), data relativa em PT-BR. Estética Creme/Bento (`rounded-2xl`, hover lift sutil).
- `src/components/context/SourceFilterChips.tsx` — pills toggleable das 8 fontes do `sourceMeta.ts`. "Todas" default. Multi-seleção.
- `src/components/context/MemberFilterSelect.tsx` — `<Select>` com lista de liderados (reusa a query de team_members do `MembersGrid` — extraída para hook `useWorkspaceMembers` se ainda não existir, senão duplica o select de forma enxuta).
- `src/pages/lider/Contexto.tsx` — página host. Header com título "Contexto", subtítulo "Tudo o que aconteceu com sua equipe". Filtros sticky no topo. Lista virtualizada simples (sem libs novas — apenas `slice` + botão "Carregar mais" usando `fetchNextPage` do infinite query). Empty state amigável. Skeleton loading.

**Arquivos editados:**

- `src/lib/navigation.ts` — adicionar item `contexto` em `LEADER_NAV_ITEMS` antes de `configuracoes`. Ícone: `Layers` (lucide). `labelKey: 'nav.lider.contexto'`.
- `src/locales/pt-BR/nav.json` (e en/es se existirem) — adicionar chave `nav.lider.contexto: "Contexto"`.
- `src/App.tsx` — registrar rota `<Route path="/lider/contexto" element={Leader(<Contexto />)} />` (lazy import seguindo o padrão das outras páginas do líder).

### UX

```text
┌─ Contexto ────────────────────────────────── [filtros sticky] ─┐
│ Tudo o que aconteceu com sua equipe                              │
│                                                                  │
│ [ Liderado: Todos ▾ ]  [Diário] [Recall.ai] [Slack] [Pulse]…    │
├──────────────────────────────────────────────────────────────────┤
│ ╭──────────────────────────────────────────────────────────────╮│
│ │ 👤 Yasmin Silva   • [Recall.ai]            há 2 horas        ││
│ │ 1:1 semanal — discussão sobre escopo do Q2                    ││
│ │ "Yasmin levantou preocupação com a carga de trabalho do…"   ││
│ ╰──────────────────────────────────────────────────────────────╯│
│ ╭──────────────────────────────────────────────────────────────╮│
│ │ 👤 Pedro Costa    • [Slack]                ontem             ││
│ │ Sinal ambient capturado em #produto                          ││
│ │ "Pedro compartilhou aprendizado sobre…"                       ││
│ ╰──────────────────────────────────────────────────────────────╯│
│                          [ Carregar mais ]                      │
└──────────────────────────────────────────────────────────────────┘

(click no card)
        │
        ▼
EvidenceDrawer → desliza pela direita com conteúdo completo
```

- Container `max-w-5xl mx-auto px-4 sm:px-6 py-8` (regra do projeto).
- Filtros aplicáveis em conjunto (AND): liderado + fontes selecionadas.
- Mudar filtro → reset do cursor + nova query.
- Estado vazio: ilustração leve + texto "Sem evidências para os filtros selecionados".
- Liderado (direct_report) que entrar pela URL `/lider/contexto` cai no `RoleRouteGuard expects="leader"` → redireciona. Sem mudança aqui.

### Aceitação

- Item "Contexto" aparece na sidebar do líder, entre Avaliações e Configurações.
- `/lider/contexto` carrega timeline ordenada por `occurred_at DESC` com até 30 itens iniciais.
- Filtro por liderado → restringe a cards daquele membro.
- Filtro por fonte (multi-pill) → restringe a `source_table IN (...)`.
- "Carregar mais" pagina sem duplicar e sem recarregar.
- Click no card abre o `EvidenceDrawer` global com conteúdo completo (mesma UX do Sprint 8.2).
- Liderado de outro workspace **não aparece** (RPC valida via workspace + leader/HR/owner).
- Performance: query inicial < 200ms para workspaces típicos (índice `(member_id, occurred_at DESC)` já existe + filtro por `member_id = ANY(allowed)` é eficiente).

### Fora de escopo (Sprint 8.4+)

- Busca textual full-text (usar embedding HNSW para "encontrar evidências sobre X").
- Agrupamento por dia/semana ("hoje", "ontem", "esta semana").
- Exportação CSV.
- Filtro por `evidence_type` (já dá pra fazer client-side, mas backlog).
- Realtime via Supabase Realtime channel para inserts novos.

### Resumo dos arquivos

Criar:
- 1 migration: nova RPC `get_team_timeline`
- `src/hooks/useTeamTimeline.ts`
- `src/components/context/EvidenceCard.tsx`
- `src/components/context/SourceFilterChips.tsx`
- `src/components/context/MemberFilterSelect.tsx`
- `src/pages/lider/Contexto.tsx`

Editar:
- `src/lib/navigation.ts` (adicionar item)
- `src/App.tsx` (rota lazy)
- `src/locales/pt-BR/nav.json` (label) + outros idiomas existentes
