---
name: Admin Empresas — 3 sub-abas + filtros globais
description: Aba Workspaces do /admin reformulada em Cards/Organograma/O que falta + legado, filtros globais (busca/segmento/status), pendências derivadas client-side
type: feature
---

A aba **Workspaces** do `/admin` foi reformulada como **Empresas** (`AdminWorkspaces.tsx`) com 4 sub-abas dentro de `Tabs` shadcn:

1. **Cards** (`CompanyCardsGrid` → `CompanyCard`) — grid Bento `rounded-2xl` com nome, owner, plano/segmento, e 4 health chips (Rhitmo Sync, sem líder, com conta, times ativos). Botão "Organograma" navega para a aba 2 com o workspace pré-selecionado via state `orgChartWs`.
2. **Organograma** (`CompanyOrgChart`) — visão hierárquica read-only: nó de workspace no topo + faixa âmbar "Times sem líder" + grid de times com líder/liderados; cada liderado com pendência ganha borda âmbar e badges (`sem conta`, `sync pendente`).
3. **O que falta** (`PendingChecklistTable`) — tabela cross-empresa com filtros próprios (busca, empresa, tipo). Linhas derivadas no hook.
4. **Estrutura (legado)** — embute `AdminStructure` para CRUD direto (workspace/time/membro).

## Filtros globais (topo)

Busca (nome/owner/cliente), segmento (`paid`/`beta`/`trial`/`internal`/`test`) e status (ativo/suspenso) — aplicados às 3 primeiras visões. Vivem em `useState` no `AdminWorkspaces`.

## Hook compartilhado `useAdminCompaniesData`

Single source of truth (`src/hooks/useAdminCompaniesData.ts`):
- Queries: `workspaces` (com `client_account`/`customer_segment`/`leader_sync_completed_at`), `teams`, `team_members` (filtrado por `archived_at IS NULL`), `get_all_users_with_metadata` RPC.
- Deriva `healthByWorkspace` (contadores por ws) e `pendingRows` (lista achatada).
- **Pendências derivadas client-side:**
  - `no_account` → `team_members.linked_user_id IS NULL`
  - `rhitmo_sync_member` → membro com `linked_user_id` mas `work_style_data IS NULL`
  - `rhitmo_sync_leader` → workspace com `leader_sync_completed_at IS NULL` (owner não respondeu pesquisa)
  - `team_no_leader` → `teams.leader_user_id IS NULL`

`PENDING_LABEL` mapeia cada tipo pra português.

## Não muda

- `AdminStructure` permanece inteiro como fallback CRUD na aba "Estrutura (legado)".
- `HRAdminInviteCard`/`HRAdminsListCard` continuam no rodapé da aba.
- Schema do banco não muda.
