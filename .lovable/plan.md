

## HR Admin Role -- Implementacao Completa

### Visao Geral

Implementar o role de HR Admin com 5 partes: migration de banco (coluna, funcoes, policies), tab de gestao no admin, guard de acesso, pagina de dashboard HR, e rota protegida.

---

### Parte 1 -- Migration de Banco

Uma unica migration SQL contendo:

1. **Coluna `hr_admin_ids UUID[]`** na tabela `workspaces` (default `'{}'`)

2. **Funcao `is_hr_admin_of_workspace(_workspace_id UUID)`** -- SECURITY DEFINER, verifica se `auth.uid()` esta no array `hr_admin_ids` do workspace

3. **3 policies RLS novas** (sem alterar existentes):
   - `HR Admin pode ver workspace` em `workspaces` (SELECT)
   - `HR Admin pode ver times` em `teams` (SELECT)
   - `HR Admin pode ver membros` em `team_members` (SELECT)
   - Nenhuma policy para `feedbacks` (HR Admin nao ve notas individuais)

4. **RPC `manage_hr_admin`** -- apenas super_admin pode chamar (usa `is_admin()`). Aceita `_workspace_id`, `_user_id`, `_action` ('add'/'remove'). GRANT para authenticated.

5. **RPC `get_hr_dashboard_metrics`** -- retorna JSONB com metricas agregadas (total_leaders, total_members, members_without_recent_feedback, members_without_recent_review, sync_completed_count, reviews_last_90_days, notes_per_leader_last_30d, sentiment_distribution). Acesso: super_admin OU hr_admin do workspace. GRANT para authenticated.

---

### Parte 2 -- Tab "Gestao de Acessos" no Admin

**AdminLayout.tsx**: Adicionar TabsTrigger `value="access"` com icone ShieldCheck e label "Gestao de Acessos", mesmas classes dos outros triggers.

**Admin.tsx**: Adicionar import de `AdminAccess` e case `{activeTab === 'access' && <AdminAccess />}`.

**Novo arquivo `src/components/admin/AdminAccess.tsx`**:
- Segue padrao visual do AdminOverview (fundo do admin, cards, tabelas)
- Secao 1: Formulario "Convidar HR Admin" com campos email, nome, workspace (select buscando todos workspaces). Botao chama edge function `admin-invite-user` com campos extras `role: 'hr_admin'` e `workspace_id`
- Secao 2: "HR Admins Ativos" -- lista workspaces com hr_admin_ids nao vazio, mostra emails dos HR Admins, botao Remover (chama RPC `manage_hr_admin` com action='remove')

---

### Parte 3 -- Edge Function admin-invite-user

Alterar `supabase/functions/admin-invite-user/index.ts`:
- Aceitar campos opcionais `role` e `workspace_id` no body (destructuring)
- Se `role === 'hr_admin'` e `workspace_id` presente:
  - `redirectTo` muda para `https://rhitmo.lovable.app/hr`
  - Apos convite bem-sucedido, chamar RPC `manage_hr_admin` via `supabaseAdmin` com o `user_id` retornado e `action='add'`
- Caso contrario: comportamento atual inalterado

---

### Parte 4 -- HRAdminGuard

**Novo arquivo `src/components/HRAdminGuard.tsx`**:
- Hook useAuth para obter user
- Query ao Supabase: `workspaces` filtrando pela policy RLS de HR Admin (a policy ja retorna apenas workspaces onde o user e hr_admin)
- Se encontrar workspace: renderiza children via React Context passando `workspaceId` e `workspaceName`
- Se nao encontrar: Navigate para `/dashboard`
- Loading: spinner centralizado

---

### Parte 5 -- Pagina HRDashboard

**Novo arquivo `src/pages/HRDashboard.tsx`**:
- Layout proprio (nao usa AppLayout nem AdminLayout)
- Header fixo: RhitmoLogo + "Painel de Lideranca" + nome do workspace + botao Sair
- Fundo `bg-[#F5F0E8]` (creme, alinhado ao design system)
- Dados via `useQuery` chamando RPC `get_hr_dashboard_metrics`

4 secoes:
1. **Grid 4 cards** (metricas principais): Lideres Ativos, Liderados, Sem Nota 30d, Avaliacoes 90d. Cards com `bg-white/80 rounded-3xl shadow-sm p-6`
2. **Alertas de Atencao**: alertas amber para membros sem nota/avaliacao, ou check verde se tudo ok
3. **Atividade por Lider**: tabela simples com notas registradas e liderados cobertos por lider nos ultimos 30d. Manager ID truncado (sem acesso a auth.users pelo frontend)
4. **Maturidade**: grid 2 colunas com barra de progresso do Rhitmo Sync e distribuicao de sentimento (barras horizontais simples, sem biblioteca de charts)

---

### Parte 6 -- Rota em App.tsx

Adicionar apos a rota `/admin`:

```text
<Route path="/hr" element={
  <HRAdminGuard>
    <HRDashboard />
  </HRAdminGuard>
} />
```

---

### Arquivos Criados/Alterados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar (coluna, funcoes, policies) |
| `supabase/functions/admin-invite-user/index.ts` | Editar (campos opcionais role/workspace_id) |
| `src/components/admin/AdminLayout.tsx` | Editar (novo tab) |
| `src/pages/Admin.tsx` | Editar (novo case) |
| `src/components/admin/AdminAccess.tsx` | Criar |
| `src/components/HRAdminGuard.tsx` | Criar |
| `src/pages/HRDashboard.tsx` | Criar |
| `src/App.tsx` | Editar (nova rota) |

### O que NAO muda

- Policies RLS existentes (apenas adicoes)
- AdminGuard, DirectReportGuard, AdminOverview, AdminSupport, AdminExport, AdminUsers
- Paginas de lider ou liderado
- AppSidebar
- Schema das tabelas existentes (exceto nova coluna em workspaces)

