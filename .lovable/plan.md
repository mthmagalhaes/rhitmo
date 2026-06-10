# Plano: Corrigir gaps dos 3 caminhos de onboarding

Plano dividido em 3 sprints sequenciais. Cada sprint é deployável sozinha, sem quebrar caminhos existentes. Total estimado: ~2 dias de trabalho.

---

## Sprint 1 — Bloqueadores (CRÍTICO + ALTA segurança)

Resolve os 5 itens que impedem o usuário de chegar ao primeiro valor ou abrem brecha de abuso.

### 1.1 — Owner duplicado no Wizard (G11 + G12)

**Problema:** `admin-invite-user` auto-cria workspace "Meu time" toda vez que recebe um convite sem `workspace_id`, então o Wizard sempre gera workspace órfão antes do real.

**Fix em `supabase/functions/admin-invite-user/index.ts`:**
- Aceitar novo parâmetro opcional `skip_auto_provision: boolean` no body.
- Aceitar novo parâmetro opcional `redirect_to: string` (validar prefixo `https://rhitmo.co/`).
- Wizard passa `skip_auto_provision: true` + `redirect_to: 'https://rhitmo.co/lider/inicio'` (ou rota de onboarding de owner se existir).
- Bloco linhas 161-197: pular se `skip_auto_provision === true` OU se `role === 'owner'`.

**Fix em `src/components/admin/wizards/NewCompanyWizard.tsx`:**
- `inviteByEmail()` (linha 113) passa `skip_auto_provision: true` quando `role === 'owner'`.
- Após criar o workspace real, fazer `UPDATE workspaces SET owner_id = resolvedOwnerId` para garantir consistência (já é feito no INSERT — só validar).

### 1.2 — Spam-invite por qualquer usuário (G14)

**Fix em `supabase/functions/admin-invite-user/index.ts:67-69`:**
- Remover o branch `else if (!authorized && !workspace_id) { authorized = true; }`.
- Substituir por: autorizar apenas se o caller for super_admin OU se for o fluxo legado de líder convidando para o próprio workspace (verificar via `EXISTS workspaces WHERE owner_id = caller.id`).
- Migrar callers do frontend que dependiam do branch antigo para passar `workspace_id` explícito.

### 1.3 — Liderado nunca recebe Auth invite (G1)

**Problema:** `NewMemberDialog` só insere em `team_members` + envia e-mail transacional manual; o liderado não tem conta `auth.users` real.

**Decisão de design:** Manter o fluxo "lazy" (sem conta Auth pré-criada) porque é mais barato e o liderado pode optar por não usar. **Mas garantir o link no primeiro signup.**

**Fix em `src/contexts/AuthEventProvider.tsx`:**
- No evento `SIGNED_IN` e `INITIAL_SESSION`, após resolver `user`, chamar RPC `claim_team_member_by_email(user.email)` (já existe na migration `20260514024702`).
- Idempotente: se já está linkado, RPC retorna sem efeito.
- Remover comentário de "auto-link desabilitado" (linha 74-77).

**Fix complementar em `src/components/NewMemberDialog.tsx`:**
- Adicionar opção "Criar conta agora (envia convite por e-mail)" como toggle — quando marcada, chama `admin-invite-user` com `workspace_id` em vez de só inserir `team_members`. Mantém o fluxo lazy como default para não quebrar UX atual.

### 1.4 — HR Admin: líder não recebe convite + time sem leader_user_id (G6 + G7)

**Fix na migration RPC `create_hr_admin_starter_workspace`:**
- Após inserir `team_members` com email do líder, marcar `team_members.role = 'leader'` (ou criar coluna `is_team_leader boolean`) para distinguir.
- Criar nova migration com **trigger** `AFTER UPDATE OF linked_user_id ON team_members`: quando `linked_user_id` passa de NULL para UUID e o `role/is_team_leader` indica líder, fazer `UPDATE teams SET leader_user_id = NEW.linked_user_id WHERE id = NEW.team_id AND leader_user_id IS NULL`.

**Fix em `src/components/HRAdminWorkspaceOnboarding.tsx`:**
- Após o RPC retornar sucesso, se `leaderEmail` foi fornecido, chamar `supabase.functions.invoke('admin-invite-user', { body: { email, role: 'leader', workspace_id } })`.
- Toast: "Convite enviado para {email}. Você pode acompanhar em Pessoas."

---

## Sprint 2 — Robustez (MÉDIA)

Resolve falhas silenciosas em casos secundários.

### 2.1 — `AuthPage.tsx:59` poll sem escopo de owner (G2)
- Adicionar `.eq('owner_id', user.id)` na query.

### 2.2 — `invite-hr-admin` pagina só 200 usuários (G8)
- Trocar `listUsers({ page: 1, perPage: 200 })` por loop paginado igual ao `admin-invite-user` (até 10.000).
- Considerar extrair helper compartilhado em `_shared/findUserByEmail.ts`.

### 2.3 — RPC HR admin: erro feio em workspace duplicado (G9)
- Wrapping no frontend (`HRAdminWorkspaceOnboarding`) em try/catch: se erro contém "já possui workspace", mostrar toast amigável "Você já tem um workspace ativo." e `navigate('/hr', { replace: true })`.

### 2.4 — Owner com workspace antigo (G15)
- No Wizard, step 2 (Owner): se `ownerId` selecionado já tem workspace (query `from('workspaces').select('id').eq('owner_id', ownerId).maybeSingle()`), mostrar warning visual: "Este usuário já é owner de outro workspace. Continuar criará um segundo workspace para ele."

### 2.5 — `get_account_context`: desempate determinístico
- Auditar a RPC (não foi lida ainda no diagnóstico). Adicionar `ORDER BY created_at DESC LIMIT 1` ou critério explícito — owner mais recente vence.
- Garantir que `is_workspace_owner` retorne o workspace ativo correto.

---

## Sprint 3 — Polimento (BAIXA)

UX pequenos que somam confiança.

### 3.1 — `signup_persona` em sessionStorage (G4)
- Trocar `localStorage` por `sessionStorage` em `PersonaSelector.tsx:16`, `AuthPage.tsx:29-36`, `Auth.tsx:69`, `AppLayout.tsx:49-96`.

### 3.2 — `window.location.href` → `navigate()` (G10)
- Em `AppLayout.tsx:133`, trocar por `navigate('/hr', { replace: true })`.

### 3.3 — Progress bar real no Onboarding (G5)
- `Onboarding.tsx:394`: animar entre 0→90% durante análise, 100% ao concluir.

### 3.4 — Validações no Wizard (G17 + G18)
- Step 4: validar `leaderInviteEmail` com regex de e-mail antes de habilitar "Próximo".
- Step 5 (revisão): filtrar visualmente times com nome vazio e desabilitar "Criar empresa" se nenhum time válido.

### 3.5 — `team_members.user_id` semântica (G3)
- Não renomear (alto risco). Adicionar comentário SQL `COMMENT ON COLUMN team_members.user_id IS 'Criador do registro (líder), não o usuário liderado. Use linked_user_id para o usuário vinculado.'`
- Adicionar comentário JSDoc no tipo TS gerado se possível (via `src/integrations/supabase/types.ts` é auto-gerado — pular essa parte).

---

## Sequência de execução técnica

```text
Sprint 1
├─ Migration: trigger leader_user_id auto-fill (1.4)
├─ Edge fn: admin-invite-user — skip_auto_provision + redirect_to + auth check (1.1, 1.2)
├─ Edge fn: deploy
├─ Frontend: NewCompanyWizard passa skip_auto_provision (1.1)
├─ Frontend: AuthEventProvider chama claim_team_member_by_email (1.3)
├─ Frontend: HRAdminWorkspaceOnboarding chama admin-invite-user pós-RPC (1.4)
└─ Frontend: NewMemberDialog ganha toggle "criar conta agora" (1.3)

Sprint 2
├─ Migration: get_account_context ORDER BY (2.5)
├─ Edge fn: invite-hr-admin paginação + helper compartilhado (2.2)
└─ Frontend: AuthPage scope, HRAdminWorkspaceOnboarding error handling, Wizard warning (2.1, 2.3, 2.4)

Sprint 3
└─ Frontend only: storage swap, navigate(), progress bar, validações Wizard
```

## O que NÃO faz parte deste plano

- Refatorar o modelo de `team_members` (campo `user_id` semanticamente ambíguo permanece — só ganha comment).
- Criar fluxo público de "signup como Owner sem ser Líder" (caminho atualmente só existe via Wizard).
- Migrar workspaces órfãos já criados em produção — requer script de saneamento separado (fora deste plano; pode ser feito após Sprint 1 via SQL ad-hoc).

## Risco residual

- **Mudança em `admin-invite-user` é breaking change** para qualquer caller que dependia do auto-provision implícito. Mitigação: `skip_auto_provision` é opt-in, default mantém comportamento atual durante uma janela de transição; em uma segunda PR (após confirmar nenhum caller frontend depende), inverter o default.
- **Trigger no `team_members.linked_user_id`** pode disparar em casos inesperados (impersonation, backfill). Mitigação: condicionar trigger a `OLD.linked_user_id IS NULL AND NEW.linked_user_id IS NOT NULL` apenas.
