

## Diagnóstico: Modal de onboarding reaparecendo + "infinite recursion"

### Causa raiz

A função `is_hr_admin_of_workspace()` é `LANGUAGE sql` com `SECURITY DEFINER`. O otimizador do PostgreSQL pode **inlinar** funções SQL, o que faz a query interna `SELECT ... FROM workspaces` ser mesclada na avaliação da política RLS da própria tabela `workspaces`, causando **recursão infinita**.

Isso faz a query de workspace no `AppLayout` falhar silenciosamente (retorna `null`), o que aciona `needsWorkspaceSetup = true` e exibe o modal indevidamente.

### Solução

**1. Migração SQL — Corrigir função recursiva**

Recriar `is_hr_admin_of_workspace` como `LANGUAGE plpgsql` (não pode ser inlinada pelo otimizador):

```sql
CREATE OR REPLACE FUNCTION public.is_hr_admin_of_workspace(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid() = ANY(
    SELECT unnest(COALESCE(hr_admin_ids, '{}'))
    FROM workspaces WHERE id = _workspace_id
  );
END;
$$;
```

Mesma correção para `effective_user_id()` (também `LANGUAGE sql`, risco similar em outras tabelas):

```sql
CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT impersonated_user_id
     FROM public.admin_impersonation
     WHERE admin_user_id = auth.uid()
     ORDER BY created_at DESC
     LIMIT 1),
    auth.uid()
  );
END;
$$;
```

**2. Frontend — Tornar a query de workspace mais resiliente**

Em `AppLayout.tsx`, adicionar tratamento de erro na query de workspace para que uma falha de RLS não acione o modal:

```typescript
const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = useQuery({
  queryKey: ['user-workspace', user?.id],
  queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Workspace query error:', error.message);
      return null;
    }
    return data;
  },
  enabled: !!user,
  retry: 2,
});

// Só mostrar modal se a query concluiu SEM ERRO e não encontrou workspace
const needsWorkspaceSetup = !authLoading 
  && !workspaceLoading 
  && !linkedMemberLoading
  && !pendingInviteLoading
  && user 
  && !workspace 
  && !workspaceError  // ← não mostrar modal se houve erro
  && !isLinkedMember
  && !hasPendingInviteByEmail;
```

### Arquivos alterados
- Nova migração SQL (corrige 2 funções)
- `src/components/AppLayout.tsx` (resiliência na query)

