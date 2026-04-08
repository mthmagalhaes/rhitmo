

## Corrigir Fluxo de Convite — Liderado vira Líder por engano

### Diagnóstico

O problema tem **duas causas raiz**:

1. **sessionStorage se perde no OAuth** — Quando Yas clica "Aceitar e Acessar", o código salva o `pending_invite` em `sessionStorage` e redireciona para `/auth?mode=signup`. Se ela faz signup via Google OAuth, o redirect externo (Google → Supabase → app) limpa a sessionStorage. Resultado: o invite nunca é processado.

2. **Sem proteção contra criação de workspace** — Sem o link feito, `useLinkedMember()` retorna `null`, e o sistema trata Yas como líder novo, exibindo `WorkspaceOnboarding`. Ela criou o workspace "Faster" e virou líder.

**Estado atual no banco:**
- `team_members` da Yas: `linked_user_id = NULL`, `invite_status = pending`
- Workspace "Faster" (orphan) criado por Yas: `dec0c903-000d-4c66-8ee8-f6fa7cf931a0`
- Auth user da Yas: `dec0c903-000d-4c66-8ee8-f6fa7cf931a0`

### Correção imediata (dados)

Via migration:
1. Linkar Yas: `UPDATE team_members SET linked_user_id = 'dec0c903-...', invite_status = 'accepted', invite_token = NULL WHERE id = '31855607-...'`
2. Deletar workspace orphan "Faster": `DELETE FROM workspaces WHERE id = '77104ace-...'`

### Correção no código (3 mudanças)

**1. Trocar `sessionStorage` → `localStorage` para `pending_invite`**

Afeta 2 arquivos:
- `src/pages/Invite.tsx` (linha 75): `sessionStorage.setItem` → `localStorage.setItem`
- `src/components/AuthEventProvider.tsx` (linhas 20, 44): `sessionStorage.getItem/removeItem` → `localStorage.getItem/removeItem`
- `src/pages/AuthPage.tsx` (linha 20): `sessionStorage.getItem` → `localStorage.getItem`

**2. Auto-link por email no AuthEventProvider**

Quando um usuário faz login pela primeira vez e NÃO tem `pending_invite`, verificar se existe um `team_members` com `email = user.email` e `invite_status = 'pending'` → auto-linkar. Isso é um safety net para quando o token se perde.

**3. Bloquear WorkspaceOnboarding para usuários com invite pendente por email**

No `AppLayout.tsx`, antes de mostrar o `WorkspaceOnboarding`, adicionar uma query extra: verificar se existe `team_members` onde `email = user.email` e `linked_user_id IS NULL`. Se sim, auto-linkar e NÃO mostrar o onboarding de workspace.

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/pages/Invite.tsx` | Trocar sessionStorage → localStorage |
| `src/components/AuthEventProvider.tsx` | Trocar sessionStorage → localStorage + adicionar auto-link por email |
| `src/pages/AuthPage.tsx` | Trocar sessionStorage → localStorage |
| `src/components/AppLayout.tsx` | Adicionar guard contra workspace creation para convidados |
| Migration SQL | Linkar Yas + deletar workspace orphan |

