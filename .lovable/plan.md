## Objetivo

Aposentar o master-detail (MemberMasterList à esquerda) em `/lider/objetivos` e `/lider/avaliacoes` e adotar a visão cross-member já consolidada em Diário/Pessoas: insight de cobertura no topo, filtros, e uma **tabela densa com 1 linha por liderado**. Clique na linha abre **sheet lateral** com o conteúdo profundo daquele liderado (sem navegar).

Sem mudanças de schema, RLS, edge functions ou lógica de negócio. Apenas refactor de UI/composição, reusando componentes existentes (`GoalsManager`, `NewGoalDialog`, `RhitmoTimelineCard`, `MonthlyRecapSection`, `PerformanceReviewList`, `CreateFormalReviewDialog`).

---

## 1) `/lider/objetivos` — Cross-member

**Header**
- Título "Objetivos" + subtítulo curto.
- CTA "Nova meta" no topo direito (abre `NewGoalDialog` pedindo escolha do liderado).

**Insight de cobertura** (novo componente `GoalsCoverageInsight`)
- Conta liderados com / sem metas ativas (status diferente de `done`/`archived` e dentro do prazo).
- Texto tipo: "X de N liderados sem metas vigentes" + chips clicáveis "Adicionar meta para Fulano".

**Filtros** (barra simples, sem URL params nesta v1)
- Busca por nome do liderado.
- Select de time (reusa `teams` do `useLeaderMembers`).
- Chips de status: Todos · Com metas ativas · Sem metas · Atrasadas.
- Ordenação: Nome · Nº de metas · Próxima due.

**Tabela densa** (estilo `PeopleListTab`)
Colunas: Liderado (avatar + nome + role) · Time · Metas ativas (badge contagem) · Próxima due (data + chip "atrasada" se passou) · % concluído (barra fina) · Ação (kebab: "Nova meta", "Ver objetivos").
- Linha inteira clicável → abre `GoalsMemberSheet`.

**Sheet lateral** (`GoalsMemberSheet`, novo)
- Sheet `side="right"` largo (`sm:max-w-2xl`).
- Header com avatar/nome/role + botão "Nova meta".
- Corpo: `<GoalsManager memberId={member.id} hideHeaderAction />` (reusa, já carrega/edita/conclui metas).
- Footer opcional: link "Abrir página do liderado".

---

## 2) `/lider/avaliacoes` — Cross-member

**Header**
- Título "Rhitmo" + subtítulo curto.
- Sem CTA global (avaliação formal nasce no contexto do liderado).

**Insight de cobertura** (novo componente `ReviewsCoverageInsight`)
- "X de N liderados sem Acompanhamento Mensal este mês" + chips "Gerar Mensal de Fulano".
- Mostra também próximos aniversários trimestrais (próximos 14 dias) reusando lógica já existente em `useRecaps`/quarterly-nudge.

**Filtros**
- Busca por nome.
- Select de time.
- Chips: Todos · Pronto p/ Mensal · Aniversário trimestral próximo · Sem formal nos últimos 6 meses.

**Tabela densa** (1 linha por liderado)
Colunas: Liderado · Time · Estado Rhitmo (chip A/B/C derivado do `RhitmoTimelineCard`) · Último Mensal (data ou "—") · Último Trimestral (data ou "—") · Última Formal (data ou "—") · Próxima ação sugerida (texto curto: "Gerar Mensal", "Confirmar trimestre", "—") · Ação (kebab: "Gerar Mensal", "Gerar Trimestral", "Nova Avaliação Formal").
- Linha inteira clicável → abre `ReviewsMemberSheet`.

**Sheet lateral** (`ReviewsMemberSheet`, novo)
- Sheet `side="right"` largo (`sm:max-w-3xl`).
- Header com avatar/nome/role.
- Corpo:
  - `RhitmoTimelineCard` (estado A/B/C + contagem de feedbacks).
  - Tabs Mensal / Formal (mesmas sub-tabs do componente atual) com `MonthlyRecapSection` e `PerformanceReviewList`.
- Reusa `CreateFormalReviewDialog` para criar formal.

---

## 3) Arquivos

**Criar**
- `src/components/leader/objetivos/GoalsCoverageInsight.tsx`
- `src/components/leader/objetivos/GoalsCrossMemberTable.tsx`
- `src/components/leader/objetivos/GoalsMemberSheet.tsx`
- `src/components/leader/avaliacoes/ReviewsCoverageInsight.tsx`
- `src/components/leader/avaliacoes/ReviewsCrossMemberTable.tsx`
- `src/components/leader/avaliacoes/ReviewsMemberSheet.tsx`
- Hook auxiliar `src/hooks/useTeamGoalsSummary.ts` (1 query agregando `goals` por `member_id` para todos os liderados do líder, via `manager_id = effectiveUserId` ou IDs do `useLeaderMembers`).
- Hook auxiliar `src/hooks/useTeamReviewsSummary.ts` (agrega `monthly_recaps` + `performance_reviews` por `member_id`).

**Reescrever (slim)**
- `src/pages/lider/Objetivos.tsx` — remove `MemberMasterList`, vira contêiner `max-w-7xl` com header + insight + filtros + tabela + sheet.
- `src/pages/lider/Avaliacoes.tsx` — mesma transformação.

**Não tocar**
- `GoalsManager`, `NewGoalDialog`, `RhitmoTimelineCard`, `MonthlyRecapSection`, `PerformanceReviewList`, `CreateFormalReviewDialog`, `MemberMasterList` (segue em uso em `/lider/1on1s`).
- Nada em `supabase/functions`, `migrations`, RLS, `loader.ts`.

---

## 4) Detalhes técnicos

- **Layout**: igual Pessoas — `max-w-7xl px-6 lg:px-8 py-6 space-y-5` (sem `h-[calc(100svh-3rem)] overflow-hidden`; volta a scroll natural da `<main>`).
- **Sheets**: `Sheet` do shadcn, `side="right"`, `sm:max-w-2xl`/`sm:max-w-3xl`, `overflow-y-auto`. Estado controlado no nível da página com `const [openMember, setOpenMember] = useState<LeaderMemberRow | null>(null)`.
- **Dados**:
  - Objetivos: 1 query `goals.select('id, member_id, title, status, target_date, metric_current, metric_target').in('member_id', allMemberIds)`. Sumariza no client.
  - Avaliações: 1 query `monthly_recaps.select('id, member_id, period_month, status').in('member_id', ids).order('period_month desc')` + 1 query `performance_reviews.select('id, member_id, review_type, created_at, status').in('member_id', ids)`. Pega last por tipo no client.
- **Filtros**: estado local na página (não URL), igual `PeopleListTab`. Pode migrar pra URL params depois.
- **Health Rhitmo** (chip A/B/C): extrai a função de derivação que hoje vive dentro de `RhitmoTimelineCard` para um util `src/lib/rhitmoState.ts` e reusa na tabela. Se a derivação for trivial (último mensal + contagem de feedbacks), recriar a função leve na tabela é aceitável.
- **safeQuery**: todas as novas queries Supabase via `safeQuery`/`safeRpc` (regra do projeto).
- **`useLeaderMembers`**: continua sendo a fonte de verdade dos liderados/times. Nenhuma RPC nova.

---

## 5) Validação

- `/lider/objetivos` mostra tabela com todos os liderados; clique abre sheet com `GoalsManager` funcional (criar/editar/concluir meta atualiza a tabela via `queryClient.invalidateQueries`).
- `/lider/avaliacoes` mostra tabela; clique abre sheet com `RhitmoTimelineCard` + tabs Mensal/Formal; criação de formal abre `CreateFormalReviewDialog` e ao concluir atualiza a tabela.
- Nenhuma regressão em `/lider/1on1s` (continua usando `MemberMasterList`).
- `useLeaderMembers`, RLS de `goals`/`monthly_recaps`/`performance_reviews` permanecem inalterados.

---

## 6) Fora de escopo

- URL params nos filtros (pode vir depois, espelhando o Diário).
- Novas RPCs/agregações no banco — tudo no client por enquanto.
- Mudanças em `MemberAdminSheet` (continua focado em admin de pessoa em `/lider/pessoas`).
- Memory update: ao final, atualizar `mem://design/dashboard/master-detail-pages` removendo `/lider/objetivos` da lista (sobra `/lider/1on1s`) e registrar o novo padrão cross-member para Objetivos/Avaliações.
