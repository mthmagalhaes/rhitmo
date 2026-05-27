## Frente B — Setup da Empresa unificado

Frente A já está no ar (Guto consegue convidar líderes, importar CSV e o `+ Criar novo time` foi removido do NewMemberDialog). Agora simplificamos o fluxo para que o Guto tenha **um lugar só** para montar a empresa inteira, mantendo o cadastro 1‑a‑1 como caminho principal e o CSV como alternativa.

### B1. RPC `setup_company_unit` (migration)

`SECURITY DEFINER`, recebe:
```text
{ workspace_id, team: {id? | name}, leader: {user_id? | invite:{email,name}}, members: [{user_id? | invite:{email,name}}] }
```

Numa transação:
1. Valida caller = Super Admin OR Owner(workspace) OR HR Admin(workspace) — senão 403.
2. Acha/cria o time **já com `leader_user_id`** (nunca passa pelo trigger `liderado-precisa-leader` com NULL).
3. Para o líder e cada liderado: se `user_id` existir, vincula em `team_members`; se for `invite`, chama internamente a mesma lógica do `admin-invite-user` (cria auth user + profile + role + team_member) sem disparar e-mail (modo silencioso, igual ao bulk-onboard).
4. Retorna `{ team_id, leader: {user_id,status}, members: [{email,user_id,status}] }`.

Disparo de convites continua manual via "Disparar convites" em Estrutura — mesma UX do bulk hoje.

### B2. Novo hub `/admin/setup` — `CompanySetupHub`

Header com contagem (`X times · Y líderes · Z liderados` do workspace ativo) e 3 cards equivalentes:

```text
┌─────────────────────────────────────────────────────────┐
│  Setup da Empresa · Faster Ops                          │
│  5 times · 3 líderes · 12 liderados                     │
├──────────────┬──────────────────┬───────────────────────┤
│ Cadastro     │ Importar         │ Convidar              │
│ 1 a 1        │ planilha         │ líder avulso          │
│ (wizard)     │ (CSV existente)  │ (LeaderPicker)        │
└──────────────┴──────────────────┴───────────────────────┘
```

- **Cadastro 1 a 1** → wizard de 3 passos (padrão Pulse wizard, ver `mem://design/wizards/pulse-wizard-pattern`):
  1. **Time** — escolher existente OU digitar nome novo
  2. **Líder** — LeaderPicker (existente OU convidar novo: email+nome)
  3. **Liderados** — lista inline, adicionar N (existente OU convite), remover, confirmar
  Submit único → `setup_company_unit` RPC → toast "Time X criado com líder Y e N liderados" + CTA "Cadastrar outro time" ou "Disparar convites agora".

- **Importar planilha** → reaproveita `BulkOnboardDialog` existente, sem mudanças.

- **Convidar líder avulso** → abre `LeaderPicker` em dialog, atalho para o caso "só quero mandar 1 convite".

### B3. Consolidação de entradas (HR Admin / Owner)

- Sidebar workspace switcher (HR Admin/Owner): adicionar item **"Setup da Empresa"** apontando para `/admin/setup`, acima de "Convidar membros" (que vira atalho rápido individual). Líder comum não vê esse item — mantém só "Convidar membros".
- Rota `/admin/setup` adicionada em `App.tsx`, gate por `isHRAdmin || isWorkspaceOwner || isSuperAdmin`.
- `/lider/pessoas` continua intocado — é o fluxo do dia-a-dia do líder comum.
- `NewTeamDialog` standalone permanece para o caso de líder comum no `/lider/pessoas` aba Times.

### Validação

1. Logar como `guto.biazzi@fstr.co`:
   - `/admin/setup` aparece na sidebar, contagem do workspace correta.
   - Wizard 1a1: criar time novo + convidar líder novo + 2 liderados novos → 1 RPC, todos criados, sem e-mail; "Disparar convites" funciona.
   - Wizard 1a1: time existente + líder existente + 1 liderado novo → vincula sem duplicar.
   - Tentar via DevTools chamar RPC com `workspace_id` alheio → 403.
2. Logar como líder comum: `/admin/setup` redireciona (sem acesso); `/lider/pessoas` continua igual.
3. CSV em `/admin/setup` → mesmo comportamento do `BulkOnboardDialog` atual.

### Arquivos a criar/editar

**Migration**
- `supabase/migrations/<ts>_setup_company_unit.sql` — função `public.setup_company_unit(...)` SECURITY DEFINER + GRANT EXECUTE para `authenticated`.

**Frontend (novos)**
- `src/pages/admin/CompanySetup.tsx` — rota `/admin/setup`, layout do hub.
- `src/components/admin/setup/SetupHubCards.tsx` — 3 cards.
- `src/components/admin/setup/OneByOneWizard.tsx` — wizard 3 passos.
- `src/components/admin/setup/StepTeam.tsx`, `StepLeader.tsx`, `StepMembers.tsx`.

**Frontend (editar)**
- `src/App.tsx` — rota `/admin/setup` com gate de role.
- `src/components/layout/WorkspaceSwitcher.tsx` (ou equivalente — ver `mem://design/sidebar/workspace-switcher-actions`) — item "Setup da Empresa" para HR Admin/Owner.

### Fora de escopo

- Mudar `teams.leader_user_id` para NOT NULL (precisa migration de dados de times legados sem líder).
- Mudar o fluxo do líder comum em `/lider/pessoas`.
- Redesign do `BulkOnboardDialog` (reaproveitado como está).
- Auto-disparo de e-mails no submit do wizard — segue padrão silencioso + "Disparar convites" manual.

### Ordem de execução

1. Migration `setup_company_unit` (sozinha, esperar aprovação).
2. Hub + wizard + cards (frontend).
3. Rota + item de sidebar.
4. Smoke test logado como Guto.