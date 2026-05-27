# Nova constituição de papéis — Owner deixa de ser "olho de Deus operacional"

## Decisões aprovadas

1. **Owner NÃO vê notas privadas / 1:1s / feedbacks** de times que não lidera.
2. **Owner como líder = líder normal** dos times onde está como `leader_user_id`. Sem override.
3. **/lider/*** passa a mostrar **só times** onde `auth.uid() = teams.leader_user_id`.
4. **/workspace** é a nova rota dedicada do Owner (e HR Admin) — estrutura, membros, billing, health agregado. SEM conteúdo qualitativo.

## Matriz final


| Capacidade                                               | Owner           | HR Admin | Leader            | Liderado       |
| -------------------------------------------------------- | --------------- | -------- | ----------------- | -------------- |
| Estrutura (times, membros, líderes)                      | ✅ todos         | ✅ todos  | ❌ só seus         | ❌              |
| Convidar/remover membro, criar/editar time, trocar líder | ✅               | ✅        | só p/ seus times  | ❌              |
| Analytics agregado (engagement, risco, health)           | ✅               | ✅        | só do seu time    | ❌              |
| Perfis Rhitmo Sync / DISC                                | ✅               | ✅        | só seus liderados | só o próprio   |
| Formal reviews `shared_with_member=true`                 | ✅               | ✅        | só seus liderados | só os próprios |
| **Feedbacks privados, notas, 1:1s, transcrições, PDIs**  | **❌** (mudança) | ❌        | ✅ seus            | ❌              |
| Billing, transferir ownership, definir HR Admin          | ✅               | ❌        | ❌                 | ❌              |


Owner × HR Admin na prática viram quase iguais em conteúdo. A diferença é **administrativa**: Owner controla conta/billing/ownership; HR Admin opera RH (competências, convites).

---

## Parte 1 — Migração de RLS (backend)

Remover o branch `is_workspace_owner_of_member(...)` das policies SELECT das seguintes tabelas (conteúdo qualitativo):

- `feedbacks`
- `meeting_transcripts`
- `goals`
- `development_plans`
- `development_items`
- `performance_reviews`
- `pulse_surveys` (manter HR e liderado, remover owner)
- `peer_feedback_requests`
- `review_peers`
- `monthly_recaps`
- `quarterly_recaps`

Owner que também for `leader_user_id` continua acessando via `is_team_leader(...)` — sem perda. Owner que NÃO é leader do time perde acesso.

Manter `is_workspace_owner_of_member` apenas em queries **estruturais/analytics** (RPCs `get_hr_*`, `get_team_pulse`, etc.) onde já dá pra trocar por `is_hr_admin_of_workspace OR owner_id = effective_user_id()`.

Criar função helper `is_workspace_admin(workspace_id)` que retorna `true` para Owner OU HR Admin daquele workspace — para uso nas RPCs estruturais (substitui dois checks separados).

## Parte 2 — Frontend /lider/* (filtrar só times do líder)

Hoje hooks como `useLeaderMembers`, `useTeamTimeline`, e várias queries em `/lider/pessoas`, `/lider/diario`, `/lider/contexto`, `/lider/inicio` dependem de RLS para retornar "o que o usuário pode ver". Após a migração de RLS, o filtro fica **automático** — Owner que não lidera o time deixa de receber as linhas.

Ajustes necessários:

- `**/lider/inicio` `TeamPulseBento**` — recalcular `sem nota recente` apenas em liderados de times próprios (já vai vir filtrado, validar).
- `**/lider/pessoas` aba Liderados** — não mostrar mais Lucas/Vinicius do Comercial pra você (são liderados do Caio).
- `**/lider/pessoas` aba Times** — mostra só times onde `leader_user_id = você` (Owner perde visão dos times de outros líderes aqui — ele vai pra `/workspace`).
- `**useLeaderMembers**` — confirmar que já usa `teams.leader_user_id = effective_user_id()`. Provavelmente sim; validar.
- `**MemberMasterList**` das páginas master-detail (`/lider/1on1s`, `/lider/diario`, `/lider/objetivos`) — passa a listar só liderados de times seus.

Sem mudança no menu lateral — `/lider/*` continua sendo "espaço do líder".

## Parte 3 — Nova rota `/workspace` (visão Owner + HR Admin)

Rota acessível para `isWorkspaceOwner OR isHRAdmin`. Layout master-detail com sidebar própria (similar a `/admin` hoje).

Seções:

```text
┌─────────────────────────────────────────────────────────┐
│  Faster Ops  · você é Owner                             │
├─────────────────────────────────────────────────────────┤
│  [📊 Visão geral] [👥 Pessoas] [🏢 Times]               │
│  [⚙️  HR Admins] [💳 Billing] [🔧 Configurações]        │
└─────────────────────────────────────────────────────────┘
```

- **Visão geral**: KPIs estruturais (nº de líderes, nº de liderados ativos, cobertura de 1:1, % com PDI, health score por time). Reaproveita componentes de `HRDashboard`/`HRAnalytics`.
- **Pessoas**: lista plana de todos do workspace com filtro por papel/time. Pode editar líder, time, remover, reenviar convite. Reaproveita `HRMembers` + `MemberProfileSheet` (que já tem ações de admin).
- **Times**: tabela de todos os times do workspace, leader, nº de liderados. Pode criar/editar/deletar/trocar líder. Reaproveita aba "Times" atual de `/lider/pessoas` mas sem o filtro de "só meus times".
- **HR Admins**: cards `HRAdminInviteCard` + `HRAdminsListCard` (já existem em `AdminWorkspaces`).
- **Billing**: redirect/embed do `/billing` atual.
- **Configurações**: nome do workspace, idioma padrão, integrações.

Reaproveitamento massivo — quase nenhum componente novo. Maior trabalho é o roteamento e a separação visual.

A aba **"Times"** que hoje vive em `/lider/pessoas?tab=times` (mostrando "Times organizam seus liderados em grupos. Toda a operação fica embaixo de você (dono do workspace)") é movida pra `/workspace/times`. Em `/lider/pessoas` essa aba some (líder não cria/deleta times — Owner/HR faz).

## Parte 4 — Atalho/Navegação

- **Workspace switcher** (sidebar topo): para Owner/HR Admin, adicionar item "Visão do workspace" → `/workspace`.
- **Sidebar `/lider**`: nenhum item novo. Continua "operacional do líder".
- `**/admin**` (super_admin [Matheus@rhitmo.co](mailto:Matheus@rhitmo.co)): inalterado — é outra dimensão (cross-workspace, suporte Rhitmo).

## Parte 5 — Comunicação ao usuário

Banner one-time no primeiro acesso pós-migração para quem é Owner:

> "A constituição da Rhitmo mudou. Como Owner, você agora vê apenas as notas privadas dos times que lidera diretamente. Para visão completa do workspace (times, pessoas, billing, health), use a nova área **Visão do workspace**."

## Detalhes técnicos

- **Migração**: 1 migration SQL recriando as 11 policies SELECT (drop + recreate). Aprovada antes de tocar em código frontend.
- `**is_workspace_admin(_workspace_id)**` nova função `SECURITY DEFINER LANGUAGE plpgsql` retornando `owner_id = effective_user_id() OR effective_user_id() = ANY(hr_admin_ids)`.
- **AccountContext**: já expõe `isWorkspaceOwner` e `isHRAdmin`. Adicionar `isWorkspaceAdmin = isWorkspaceOwner || isHRAdmin` para gating da nova rota.
- **Roteamento**: criar `src/pages/workspace/{Overview,People,Teams,HRAdmins,Settings}.tsx`. Layout em `src/components/workspace/WorkspaceLayout.tsx`.
- **Memória**: atualizar `mem://architecture/papeis-e-permissoes` com nova matriz; criar `mem://architecture/workspace-route-and-owner-scope`.

# Importante

Não quebre nada que já esteja funcionando  
Não perca o histórico de nenhum líder, liderado e Rh Admin.  


## Fora do escopo (não fazer agora)

- Override "acessar como Owner" com log de auditoria.
- Permissões granulares (ex: HR só lê de certos times).
- Transferência de ownership via UI (continua via DB/Admin).
- Quebrar `/admin` (super_admin) em algo diferente.