

## Blindagem RLS da tabela `team_members`

### Diagnóstico

Analisando as 7 políticas atuais da tabela `team_members`, todas já estão com `Roles: {authenticated}`. Porém, o scanner pode estar detectando que a tabela não tem uma política explícita de **deny para anon**, ou que o grant padrão permite acesso. A correção consiste em:

1. Dropar e recriar todas as políticas garantindo `TO authenticated` explícito
2. Revogar qualquer grant residual do role `anon` na tabela

### Migration SQL

Uma única migration que:

1. **Revoga acesso anon**: `REVOKE ALL ON public.team_members FROM anon;`
2. **Dropa todas as 7 políticas existentes** por nome
3. **Recria as 7 políticas idênticas**, todas com `TO authenticated`:
   - SELECT: Owners (via `effective_user_id()` + workspace ativo)
   - SELECT: HR Admin (via `is_hr_admin_of_workspace`)
   - SELECT: Linked users (via `linked_user_id = auth.uid()`)
   - INSERT: Owners
   - UPDATE: Owners
   - UPDATE: Linked users (próprio perfil)
   - DELETE: Owners
4. **Garante grant para authenticated**: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;`

### O que NÃO muda
- Nenhuma lógica de acesso é alterada (mesmos `USING` e `WITH CHECK`)
- Nenhum arquivo frontend é modificado
- Nenhuma outra tabela é afetada

