---
name: New Company Wizard (Admin)
description: Wizard full-screen de 5 passos em /admin → "Nova empresa" para fundar workspace+owner+HR+times+líderes; reutiliza admin-invite-user e manage_hr_admin
type: feature
---

Wizard full-screen acionado pelo botão **"Nova empresa"** no header da aba `Empresas` em `/admin` (`NewCompanyWizard` em `src/components/admin/wizards/`). Segue o padrão validado `mem://design/wizards/pulse-wizard-pattern`: `Dialog` `w-screen h-screen`, header só com título, footer com barra de progresso fina + Voltar/Próximo.

## 5 passos

1. **Empresa** — nome, `client_account`, `customer_segment` (`paid`/`beta`/`trial`/`internal`/`test`), `plan_tier` (`pulse`/`pro`/`business`).
2. **Owner** — busca em `users` (RPC `get_all_users_with_metadata`) **ou** convite por nome+e-mail.
3. **HR Admins** — multi-select de usuários existentes + um convite por e-mail (opcional, pode ser pulado se o próprio Owner gerencia).
4. **Times e líderes** — repeater de `{ name, leaderId | leaderInviteEmail }`. Pelo menos um time.
5. **Revisão** — preview do que será criado, botão "Criar empresa".

## Backend (sem migration nova)

`handleCreate` em sequência:
1. Se Owner é convite → `supabase.functions.invoke('admin-invite-user', { email, name, assigned_plan, role: 'owner' })` (sem `workspace_id`, autorizado para super_admin). Captura `data.user.id`.
2. `INSERT workspaces` com `owner_id`, `plan_tier`, `customer_segment`, `client_account`.
3. Para cada HR existente → `rpc('manage_hr_admin', { _workspace_id, _user_id, _action: 'add' })`. Para convite por e-mail → `admin-invite-user` com `role: 'hr_admin'` + `workspace_id`.
4. Para cada time → resolve `leader_user_id` (existente ou via `admin-invite-user` com `role: 'leader'`) e `INSERT teams`.
5. Toast de sucesso, invalida queries (`admin-companies-*` + `admin-structure-*`), fecha.

## Reutiliza

- `admin-invite-user` edge function (autoriza super_admin sem workspace_id; com workspace_id autoriza Owner/HR).
- RPC `manage_hr_admin`.
- Hook compartilhado `useAdminCompaniesData` para passar a lista de `users` ao wizard.
