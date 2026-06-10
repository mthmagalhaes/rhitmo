# Sprint 2 — Robustez (severidade MÉDIA)

Continuação do plano de correção dos gaps. Sprint 1 já está deployado e validado. Sprint 2 cobre os 5 gaps de robustez que não bloqueiam, mas degradam silenciosamente.

---

## 2.1 — `AuthPage` faz poll de workspace sem filtrar por owner (G2)

**Arquivo:** `src/pages/AuthPage.tsx` (linha ~59)

**Mudança:** adicionar `.eq('owner_id', user.id)` na query que busca workspace pra rotear o usuário pós-login. Sem isso, o primeiro workspace que aparecer (qualquer um onde ele tenha visibilidade RLS) pode disparar checkout/redirect errado.

---

## 2.2 — `invite-hr-admin` pagina só 200 usuários (G8)

**Arquivo:** `supabase/functions/invite-hr-admin/index.ts`

**Mudança:** substituir `listUsers({ page: 1, perPage: 200 })` pelo loop paginado (até 10 páginas × 1000) que já existe em `admin-invite-user`. Extrair pra helper `supabase/functions/_shared/findUserByEmail.ts` e usar nos dois lugares (DRY).

---

## 2.3 — RPC `create_hr_admin_starter_workspace` erro feio em duplicata (G9)

**Status:** já parcialmente coberto no Sprint 1 (`HRAdminWorkspaceOnboarding.tsx` agora intercepta `/já possui (um )?workspace/i` e mostra toast amigável + redireciona).

**Ação Sprint 2:** apenas confirmar que a regex bate com a mensagem exata do RPC e adicionar fallback genérico ("Já existe um workspace associado ao seu usuário") pra outras variações.

---

## 2.4 — Wizard: warning quando owner já tem workspace (G15)

**Arquivo:** `src/components/admin/wizards/NewCompanyWizard.tsx`

**Mudança:** no Step 2 (escolher owner), quando o usuário seleciona um `ownerId` existente, fazer query `from('workspaces').select('id, name').eq('owner_id', ownerId)`. Se retornar ≥1, renderizar `Alert` amarelo: "Este usuário já é owner de N workspace(s). Continuar criará um novo." Não bloqueia, só avisa.

Aplicar a mesma checagem pro convite por e-mail (Step 2 → tab "Convidar"): se o e-mail digitado já existe como owner em algum workspace, mostrar o mesmo alert.

---

## 2.5 — `get_account_context`: desempate determinístico (G5')

**Arquivo:** nova migration

**Mudança:** auditar a RPC `get_account_context` (não foi lida ainda) e garantir que, quando um usuário é owner de mais de 1 workspace, retorne sempre o mesmo (por `ORDER BY created_at DESC LIMIT 1` ou critério explícito de "workspace ativo"). Sem isso, AccountContext pode oscilar entre workspaces órfãos legados e o real.

---

## Sequência

```text
1. Migration: get_account_context com desempate determinístico (2.5)
2. Edge fn: criar _shared/findUserByEmail.ts + refatorar invite-hr-admin e admin-invite-user (2.2)
3. Frontend: AuthPage filter owner_id (2.1)
4. Frontend: NewCompanyWizard warning multi-workspace owner (2.4)
5. Frontend: HRAdminWorkspaceOnboarding fallback regex (2.3)
```

Tudo independente. Cada item pode ser revertido isoladamente.

## Fora do escopo (vai pro Sprint 3)

Trocas `localStorage` → `sessionStorage`, `window.location.href` → `navigate()`, progress bar real do onboarding, validações de e-mail no Wizard, comentário SQL no `team_members.user_id`.

## Riscos

- **`get_account_context` é central** — qualquer mudança nela impacta todo o roteamento de role/workspace. Migration vai apenas adicionar `ORDER BY`/`LIMIT 1`, sem mudar shape do retorno. Vou ler a RPC antes de tocar e abortar essa parte se a função já tiver desempate.
- **Helper compartilhado em `_shared/`** — função Deno em `_shared/` não herda `deno.json`, então preciso usar `npm:` specifiers nos imports e referenciar tipos via `/// <reference>` se necessário. Caso contrário, mantém helper inline em cada função.
