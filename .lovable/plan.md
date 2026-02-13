

## Plano: Corrigir Alertas de Seguranca RLS

### Contexto Importante

A funcao `effective_user_id()` **existe e funciona corretamente** no banco de dados. Ela suporta a feature de Admin Impersonation (tabela `admin_impersonation`). Substituir por `auth.uid()` quebraria essa funcionalidade.

O problema real e que o scanner nao encontrou a funcao nos arquivos de migracao, gerando um falso positivo. A solucao correta e:
- Manter `effective_user_id()` nas policies
- Resolver o alerta do scanner

---

### Acao 1: Resolver Alerta meeting_transcripts (falso positivo)

As policies de `meeting_transcripts` ja estao corretas com `TO authenticated` e `effective_user_id()`. O alerta sera resolvido marcando-o como corrigido no scanner, pois a funcao existe no banco.

Nenhuma alteracao SQL necessaria nesta tabela.

---

### Acao 2: Hardening team_members (TO authenticated)

**Problema real:** 4 policies usam `TO PUBLIC` (default), permitindo acesso anonimo:
- "Owners podem ver membros do time" (SELECT)
- "Owners podem criar membros no time" (INSERT)
- "Owners podem atualizar membros do time" (UPDATE)
- "Owners podem deletar membros do time" (DELETE)

As outras 2 ("Linked users can view own profile" e "Linked users can update own basic profile") ja usam `TO authenticated`.

**SQL Migration:**

```sql
-- Drop 4 policies com TO PUBLIC
DROP POLICY "Owners podem ver membros do time" ON public.team_members;
DROP POLICY "Owners podem criar membros no time" ON public.team_members;
DROP POLICY "Owners podem atualizar membros do time" ON public.team_members;
DROP POLICY "Owners podem deletar membros do time" ON public.team_members;

-- Recriar com TO authenticated explicito
CREATE POLICY "Owners podem ver membros do time"
ON public.team_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

CREATE POLICY "Owners podem criar membros no time"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

CREATE POLICY "Owners podem atualizar membros do time"
ON public.team_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

CREATE POLICY "Owners podem deletar membros do time"
ON public.team_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);
```

---

### Acao 3: Resolver alertas no scanner

Marcar o alerta `meeting_transcripts_function` como resolvido (funcao existe, falso positivo).

---

### Resumo de Mudancas

| Tabela | Acao | Detalhe |
|--------|------|---------|
| meeting_transcripts | Nenhuma SQL | Alerta e falso positivo, resolver no scanner |
| team_members | Migration SQL | 4 policies recriadas com `TO authenticated` |

### Por que NAO substituir effective_user_id() por auth.uid()

A funcao `effective_user_id()` retorna `auth.uid()` normalmente, mas quando um admin esta impersonando um usuario (tabela `admin_impersonation`), retorna o ID do usuario impersonado. Substituir quebraria a feature de suporte/admin.

