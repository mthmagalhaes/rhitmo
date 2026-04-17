

## Diagnóstico (3 bugs distintos, todos confluindo na mesma confusão)

A estrutura no banco está **correta** conforme seu diagrama: workspace FAP existe, todos os 7 times têm `workspace_id` da FAP, cada líder está corretamente vinculado em `leader_user_id`. O problema é em 3 camadas diferentes:

### Bug 1 — Coluna "Workspace(s)" vazia para líderes não-owner
RPC `get_user_caps` retorna `leader_of` com chaves `team_id` / `team_name` / `workspace_name`, **mas sem `workspace_id`**. O frontend (`AdminUsers.tsx` L167) tenta ler `t.workspace_id` → `undefined` → entrada ignorada. Por isso aparece `—`.

### Bug 2 — Status "Sem workspace" para líderes não-owner
O mapa `workspaceStatusByOwner` (L132) só indexa por `owner_id`. Líderes que não são owner caem em `!wsInfo` → "Sem workspace". Conceitualmente errado: um líder de time **está** vinculado ao workspace.

### Bug 3 (o crítico) — Impersonate vaza todos os times do workspace
Quando você impersona `coord.cursodireito@`, `auth.uid()` continua sendo o admin (matheus). A função `is_admin()` retorna `true` baseada em `auth.uid()` original. A política `teams_admin` (`FOR ALL USING is_admin()`) então libera **todos** os times do banco, ignorando RLS. Resultado: o frontend faz "todos os times do workspace FAP" e RLS não filtra → 7 times aparecem.

A função `effective_user_id()` já existe e funciona certo no resto do sistema. Só `is_admin()` (e potencialmente outras funções com `auth.uid()` direto em policies) precisam respeitar impersonação.

## Plano de fix

### Fix 1 — RPC `get_user_caps` retornar `workspace_id` em `leader_of`
Migration: adicionar `'workspace_id', t.workspace_id` no `jsonb_build_object` de `leader_of`. Frontend já lê esse campo.

### Fix 2 — `AdminUsers.tsx` calcular status considerando "qualquer vínculo com workspace ativo"
Trocar a lógica de `workspaceStatusByOwner` por algo que pergunte: "este usuário tem **algum** vínculo (owner, hr, leader, member) com algum workspace ativo?". Se sim → status do workspace primário. Se não → "Sem workspace". Vou usar o resultado de `getUserWorkspaces(u)` cruzado com o mapa `workspaceById` que já existe.

### Fix 3 (o mais importante) — `is_admin()` respeitar impersonação
Atualizar a função SQL `is_admin()` para retornar `false` quando há impersonação ativa para `auth.uid()`. Assim, durante impersonate, o admin perde os superpoderes e RLS aplica as regras normais do usuário impersonado — exatamente como deveria ser para "ver como ele vê".

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Durante impersonação, super-admin perde privilégios para enxergar
  -- exatamente o que o usuário impersonado vê.
  IF EXISTS (
    SELECT 1 FROM admin_impersonation
    WHERE admin_user_id = auth.uid() AND ended_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin');
END $$;
```

Isso é seguro: o admin pode encerrar a impersonação a qualquer momento (botão "Encerrar visualização") e recupera os privilégios.

### Validação após o fix
- Coord. Direito impersonado: vê apenas o time "Direito" no TeamTabs, sem o "Todos" mostrando 7 times.
- Direção Acadêmica impersonado: vê apenas "Direção Acadêmica".
- Mateus (owner) sem impersonate: vê todos os 7 times normalmente.
- Tabela admin: todos os 7 líderes mostram "FAP — Faculdade Baixo Parnaíba" na coluna Workspace(s) e status "Ativo".

## Arquivos / migrations

1. **Migration SQL**: alterar `is_admin()` + alterar `get_user_caps()` para incluir `workspace_id` em `leader_of`.
2. **`src/components/admin/AdminUsers.tsx`**: refatorar `workspaceStatusByOwner` → `workspaceStatusByUser` que considera todos os vínculos (~15 linhas).

Zero edge functions. Estrutura conceitual do diagrama (workspace → leaders → times → liderados) já está implementada — só faltava UI refletir e impersonate respeitar RLS.

