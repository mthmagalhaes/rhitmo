
# Análise: liberar HR Admin para o Guto (Faster Ops)

Este plano é uma análise + recomendações. Nada será alterado até você aprovar a próxima etapa de implementação.

## 1. Situação atual na Faster Ops

Dados encontrados no banco:

- **Workspace:** `Faster Ops` · `plan_tier = pulse` · `owner_id = matheus.magalhaes@fstr.co`
- **`hr_admin_ids` = []** → hoje **não existe** HR Admin na Faster Ops.
- **Guto não tem conta** ainda (`%guto%@fstr.co` não retorna nada em `auth.users`).
- Já estão na base: Matheus (owner), Gabriela, Giovanna, Guilherme, Laís, Yasmin.

Implicação: para o Guto virar HR Admin, precisamos (a) criar o convite, (b) marcar como HR Admin via `manage_hr_admin`, e (c) destravar o gate de plano (hoje todo `/hr/*` está bloqueado para Pulse — ver §3).

## 2. O que um HR Admin pode fazer hoje (mapa de superfície)

### 2.1 Rotas dedicadas `/hr/*` (guarda: `HRAdminGuard` em `hr_admin_ids`)
| Rota | Página | O que faz |
|---|---|---|
| `/hr` | `HRDashboard` | KPIs do workspace: total líderes/liderados, sem feedback recente, sem review, cobertura PDI, viés detectado 7d, sentiment, ranking de líderes |
| `/hr/teams` | `HRTeams` | Lista de líderes do workspace + drill-down do time de cada um (read-only) |
| `/hr/members` | `HRMembers` | Lista global de TODOS liderados do workspace (busca, filtro por líder e por PDI) + `MemberProfileSheet` |
| `/hr/analytics` | `HRAnalytics` | Analytics agregados (heatmap, risco, etc.) |
| `/hr/competency-framework` | `CompetencyFramework` | Gestão de frameworks de competência e job roles |

Todas essas rotas chamam RPCs `get_hr_*` que exigem `hr_admin_ids @> [auth.uid()]`. Sem isso, o guarda redireciona para `/dashboard`.

### 2.2 Rotas de líder `/lider/*` que HR Admin também acessa
`AccountContext` define `isLeader = role === 'leader' || role === 'hr_admin'`, ou seja, **HR Admin é tratado como líder para todo o app** quando entra no contexto `/lider`. Isso significa que ele:

- vê **toda a navegação de líder** (`/lider/inicio`, `/lider/pessoas`, `/lider/diario`, `/lider/objetivos`, `/lider/avaliacoes`, `/lider/mentor`, `/lider/configuracoes`);
- em `/lider/pessoas` recebe poderes elevados via `canManageTeams = isHRAdmin || isWorkspaceOwner`:
  - aba **Times** (criar/editar/arquivar times) — escondida para líder comum;
  - aba **Analytics** — escondida para líder comum;
  - **Bulk invite** (até 100 e-mails) — bloqueado para líder comum;
- em `/lider/configuracoes` consegue editar **Ambient Slack Settings** do workspace inteiro (toggle por `isHRAdmin || isWorkspaceOwner`).

### 2.3 Conteúdo que ele NÃO deveria enxergar mas pode acabar enxergando

O contexto consolida `isLeader=true` para HR Admin. Como Matheus é o `leader_user_id` de todos os times atuais, o Guto vai ver pelo `/lider/inicio`/`/lider/diario` **a casa do Matheus** (próximas 1:1s, briefs, mentor chat, diário de feedbacks já escritos). Isso ocorre porque:

- RLS de `feedbacks`, `meeting_transcripts`, `goals`, `development_plans`, `performance_reviews` libera SELECT para `manager_id = auth.uid()` **OU** `is_workspace_owner_of_member(member_id)`. HR Admin **não** é owner, então tecnicamente **não vê** feedbacks privados, briefs e transcripts dos liderados de outros líderes. Bom: o RLS protege o conteúdo.
- Porém a **UI de `/lider/inicio` é genérica** — ela tenta carregar "próximas 1:1s do líder logado". Para o Guto isso vai virar tela vazia + componentes em estado de erro/skeleton.
- O **Mentor Chat** abre normalmente para HR Admin. Não está claro se há proteção contra o Guto perguntar sobre liderados de times que ele não lidera. Precisa auditar antes de liberar.

### 2.4 Onboarding inicial específico de HR Admin
- Componente `HRAdminWorkspaceOnboarding` é disparado quando `signupPersona === 'hr_admin'` e o user ainda não tem workspace. Chama RPC `create_hr_admin_starter_workspace`.
- Para o Guto **isso não se aplica** — a Faster Ops já existe; ele só precisa ser adicionado como HR Admin via `manage_hr_admin`.

### 2.5 Painel `/admin`
Restrito ao super admin (`matheus@rhitmo.co`). HR Admin **não tem** acesso. Toda criação/remoção de HR Admins hoje só acontece em `/admin → Workspaces → HRAdminInviteCard` e via RPC `manage_hr_admin`.

## 3. Bloqueios e bugs a resolver ANTES de liberar o Guto

### 🛑 Bloqueador 1 — Plan gate
Todas as páginas `/hr/*` chamam `usePlanLimits().hasHrDashboard`. Para `plan_tier = 'pulse'`, esse flag é `false` → renderiza `<HRUpgradeGate />` ("exige Enterprise"). Faster Ops está em Pulse → Guto entraria no painel HR e veria só upsell.

**Decisão necessária:** vamos (a) subir Faster Ops para Enterprise/Business, (b) criar um override por workspace (`hr_dashboard_override = true`), ou (c) liberar o painel HR no plano atual? Recomendo **(b) override** — mantém comercial limpo e dá liberdade pra clientes early-adopter.

### 🛑 Bloqueador 2 — `hr_admin_ids` vazio + Guto sem conta
1. Criar usuário do Guto (`admin-invite-user` com `role: 'hr_admin'`, `workspace_id: 27ee8977…`). Isso já adiciona ao `hr_admin_ids` automaticamente (`HRAdminInviteCard` faz isso).
2. Confirmar que o convite cai por e-mail e o primeiro login passa pelo onboarding correto (sem disparar `HRAdminWorkspaceOnboarding`, já que o workspace existe).

### ⚠️ Risco 1 — UI de líder mostrando dados do owner
HR Admin entra em `/lider/inicio` (default home) e vê briefs/1:1s do Matheus (ou tela quebrada). Antes de liberar:
- **opção A:** mudar o home padrão de HR Admin para `/hr` (já existe `sidebar.viewAsLeader`, mas o default ainda é `LEADER_HOME`);
- **opção B:** adicionar guarda em `/lider/inicio`, `/lider/diario`, `/lider/mentor` para redirecionar HR Admin que **não é também leader_user_id** para `/hr`;
- **opção C:** esconder do sidebar os itens "Início, Diário, Objetivos, Avaliações" quando `isHRAdmin && !isOwnLeader`. Sugiro **A + C**.

### ⚠️ Risco 2 — Permissões elevadas em `/lider/pessoas`
Hoje HR Admin tem `canManageTeams = true`, então pode **deletar/arquivar times**, mudar líder, fazer bulk invite. Confirmar com você se isso é desejado para o Guto **agora** ou se queremos uma rampa (ex.: HR Admin só lê, sem deletar).

### ⚠️ Risco 3 — Mentor Chat sem escopo
`MentorChat` abre para HR Admin com `userType="leader"`. Precisa garantir que o chat só responda sobre o workspace dele e nunca expor dados privados de feedbacks dos times. Precisa auditar `chat-mentor` edge function (já existe RAG por workspace?) antes de liberar.

### 🐞 Bug latente — BulkOnboardDialog com UUID em vez de nome
Em `LiderPessoas` linha 1231: `workspaceNames={workspaceId ? [workspaceId] : []}` — está passando o **UUID** como se fosse o nome do workspace. Provavelmente o dialog está filtrando errado (ou ignorando). Vale corrigir junto.

### 🐞 Inconsistência — `/lider/configuracoes` mostra "Workspace" mas não permite editar nome/owner
HR Admin precisaria editar o nome do workspace, gerenciar planos, talvez convidar outro HR Admin. Hoje a configuração diz **"acesse o painel administrativo"** — que ele não tem. Precisamos:
- liberar HR Admin para gerenciar outros HR Admins do mesmo workspace (`manage_hr_admin` já existe; só falta UI);
- permitir editar nome do workspace e ver billing (hoje `Billing` vive em `/lider/configuracoes?tab=faturamento` e funciona para owner; HR Admin precisa do mesmo).

## 4. Plano sugerido (em ordem de execução, para próximo loop)

1. **Override de plano** — adicionar coluna/flag `hr_dashboard_override boolean` em `workspaces` e fazer `usePlanLimits` respeitar. Ligar para Faster Ops.
2. **Convidar Guto** — UI em `/admin` já resolve; gerar convite `role='hr_admin', workspace_id=Faster Ops`.
3. **Roteamento de home** — HR Admin que não é leader de nenhum time é mandado para `/hr` no login (alterar `getHomeRoute` + `DirectReportGuard`).
4. **Sidebar enxuta para HR Admin** — quando `isHRAdmin && !é leader_user_id de algum time`, sidebar mostra apenas: Workspace, /hr, /hr/teams, /hr/members, /hr/analytics, /hr/competency-framework, Configurações.
5. **Painel "Acessos" dentro de `/lider/configuracoes` para HR Admin** — listar HR Admins, adicionar/remover, ver owner, ver billing.
6. **Guarda de Mentor Chat** — confirmar escopo de workspace e bloquear leitura cruzada de feedbacks privados.
7. **Auditoria de poderes** — decidir explicitamente o que HR Admin pode em `/lider/pessoas` (deletar times? mudar líder? bulk invite? exportar CSV?). Recomendo manter tudo, mas **logar em audit trail**.
8. **Fix do bug de `BulkOnboardDialog`** — passar `workspace.name` no lugar de `workspaceId`.

## 5. Perguntas para você antes de implementar

1. **Faster Ops fica em Pulse com override**, ou subimos para Enterprise comercialmente?
2. **Guto pode deletar times / mudar líder / fazer bulk invite** já no dia 1, ou começamos read-only?
3. **HR Admin deve poder convidar outros HR Admins** do mesmo workspace (autoatendimento) ou só você cria via `/admin`?
4. Quer que o **home padrão** dele seja `/hr` ou `/lider/pessoas`? (Recomendo `/hr` para não confundir com a tela do líder.)

Posso seguir com a implementação assim que você responder essas 4 perguntas.
