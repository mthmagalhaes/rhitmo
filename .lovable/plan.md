# Fase 2 — Admin reformulado + Fase 3 — Wizard de nova empresa

Hoje a aba **Workspaces** do `/admin` é uma árvore expansível (`AdminStructure.tsx`, 886 linhas) que mistura criar/editar/deletar workspace, time e membro num único componente. Funciona, mas: (1) não há visão de empresa como entidade, (2) não dá pra ver organograma, (3) "o que falta" cada usuário fazer (Rhitmo sync, vincular líder, responder pulse) só aparece se você cavar, (4) times órfãos e workspaces errados se misturam silenciosamente.

A Fase 2 reorganiza essa aba em **três visões irmãs** com filtros fortes, e a Fase 3 adiciona um wizard pra fundar empresa nova sem dor.

---

## Fase 2 — Admin reformulado

### 2.1 Nova IA da aba "Workspaces" → renomeada para **"Empresas"**

Três sub-abas dentro de `AdminWorkspaces.tsx`:

```text
┌─ Empresas (admin) ───────────────────────────────────────┐
│  [Cards]  [Organograma]  [O que falta]                   │
│  ─────────────────────────────────────────────────────── │
│  Filtros globais: busca · segmento · status · tem líder? │
└───────────────────────────────────────────────────────────┘
```

Filtros vivem no topo e se aplicam às três visões (`useState` compartilhado em `AdminWorkspaces`). Mantemos `HRAdminInviteCard` e `HRAdminsListCard` no rodapé.

### 2.2 Visão "Cards" (default)

Grid de **CompanyCard** (uma por workspace), Bento-style `rounded-2xl` + shadow soft. Cada card:

```text
┌───────────────────────────────────────────┐
│ Faster        [Pago · Pro]   ⋮            │
│ 24 pessoas · 5 times · Owner: Vitor       │
│ ─────────────────────────────────────────  │
│ ✓ 18 com Rhitmo Sync   ⚠ 4 sem líder      │
│ ⚠ 2 órfãos             ✓ 22/24 ativos      │
│ ─────────────────────────────────────────  │
│ [Abrir organograma]   [Impersonar Owner]  │
└───────────────────────────────────────────┘
```

Substitui a árvore atual como entrada principal. Clicar em "Abrir organograma" leva à sub-aba 2.3 já filtrada por aquele workspace.

### 2.3 Visão "Organograma"

Diagrama hierárquico read-only por workspace (workspace → times → líderes → liderados). Implementação simples em SVG/HTML puro (sem libs novas): layout em árvore vertical com `flex` + linhas via `border`, expandindo um time por vez. Cada nó mostra avatar + nome + chip do papel; nós com pendências ficam com borda âmbar.

Filtro de workspace no topo da sub-aba (default = primeira empresa). Times órfãos (sem `leader_user_id`) aparecem numa faixa "Times sem líder" acima do organograma — visual claro do problema que o Matheus relatou.

### 2.4 Visão "O que falta"

Tabela achatada (cross-workspace) de **pendências por pessoa**, derivada client-side dos dados que já carregamos:

| Pessoa | Empresa | Time | Papel | Pendências |
|---|---|---|---|---|
| Ana    | Faster | Ops | Liderada | `Rhitmo Sync` `Conta não criada` |
| Time X | Faster | —   | —        | `Sem líder` |
| João   | Acme   | Dev | Líder    | `Não respondeu pesquisa` |

Pendências derivadas:
- `Sem conta` → `team_members.linked_user_id IS NULL`
- `Rhitmo Sync pendente` → membro sem `disc_profile`/sem `personality_data` (campo já lido em outras telas)
- `Sem líder` → time com `leader_user_id IS NULL`
- `Workspace errado` → membro cujo `linked_user_id` é Owner de outro workspace ativo (heurística leve)
- `Pesquisa Rhitmo pendente` → líder sem `leader_sync_completed_at`

Filtros adicionais nesta visão: tipo de pendência (multi-select), workspace, papel. Botões inline por linha: `Reenviar convite`, `Reenviar pesquisa`, `Abrir card`.

### 2.5 O que sobra do `AdminStructure` atual

Toda a lógica de CRUD (dialogs de criar/editar/deletar workspace/time/membro) é **preservada e extraída** para `useAdminStructureMutations.ts`, consumida pelos novos componentes via menu `⋮` em cada card/nó. Sem perda de funcionalidade.

---

## Fase 3 — Wizard `/admin/empresas/nova`

Botão **"Nova empresa"** no header da aba Empresas abre wizard full-screen seguindo o padrão validado (`mem://design/wizards/pulse-wizard-pattern`): 5 passos, footer com progresso fino + Voltar/Próximo.

### Passos

1. **Empresa** — nome, segmento (`beta` / `paid` / `trial` / `internal` / `test`), `client_account`, plano (`pulse`/`pro`/`business`).
2. **Owner** — buscar usuário existente OU convidar por e-mail (cria placeholder via `admin-invite-user` edge function já existente).
3. **HR Admin(s)** — opcional, multi-select de usuários existentes + convite por e-mail. Pode ser o próprio Owner.
4. **Times e líderes** — repeater (`name` + líder via search). Permite "Adicionar time" várias vezes. Pelo menos um time.
5. **Revisão** — preview do que vai ser criado + botão "Criar empresa".

### Backend

Tudo via tooling já existente — sem migration nova:
- `INSERT workspaces` (com `client_account`/`customer_segment`/`plan_tier`).
- `INSERT teams` em batch.
- `UPDATE workspaces.hr_admin_ids` se houver HR.
- Convites de Owner/HR/Líder via `admin-invite-user` (já existe).

Sucesso → fecha wizard, invalida queries `admin-structure-*`, navega pra `/admin` aba Empresas com card recém-criado destacado por 3s.

---

## Estrutura de arquivos

```text
src/components/admin/
├── AdminWorkspaces.tsx           [refactor: 3 sub-abas + filtros]
├── companies/
│   ├── CompanyCard.tsx           [novo]
│   ├── CompanyCardsGrid.tsx      [novo]
│   ├── CompanyOrgChart.tsx       [novo]
│   ├── PendingChecklistTable.tsx [novo]
│   └── useCompanyHealth.ts       [novo — deriva contadores]
├── wizards/
│   ├── NewCompanyWizard.tsx      [novo — Fase 3]
│   └── steps/{Empresa,Owner,HR,Times,Revisao}.tsx
└── AdminStructure.tsx            [reduz a hub legado; CRUD extraído]

src/hooks/useAdminStructureMutations.ts  [novo — reutiliza dialogs existentes]
```

### Memórias a salvar após approval

- `mem://admin/companies-tab-overhaul` — 3 sub-abas (Cards, Organograma, O que falta) + filtros globais; "O que falta" deriva pendências client-side.
- `mem://features/admin/new-company-wizard` — wizard 5 passos sob `/admin` → "Nova empresa"; usa `admin-invite-user` pra Owner/HR/líder.

---

## Fora desta fase

- **Fase 4 — Health-score por empresa** (deixada pra depois conforme pedido).
- Mudanças de schema. Reaproveitamos `workspaces`, `teams`, `team_members`, `user_roles`, `client_account`, `customer_segment`.
- Drag-and-drop no organograma (read-only por ora).
