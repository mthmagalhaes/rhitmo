
# Plano de Correção: Dashboard Vazio e Workspaces Duplicados

## Diagnóstico

Após investigação detalhada, identifiquei a causa raiz do problema:

### O que aconteceu
1. O código usa `.maybeSingle()` para buscar o workspace do usuário
2. Quando existe mais de 1 workspace, `.maybeSingle()` retorna `null` ao invés de um erro
3. O componente `AppLayout.tsx` interpreta `null` como "usuário não tem workspace" e cria um novo automaticamente
4. Isso gerou um **loop infinito de criação** que afetou 2 usuários:
   - **matheus.magalhaes@fstr.co**: 23.518 workspaces criados (o correto é "Faster Ops" com 6 membros)
   - **matheus@rhitmo.co**: 18.344 workspaces criados (o correto é "Rhitmo Inc. 🙂" com 3 membros)

### Arquivos afetados
6 arquivos usam `.maybeSingle()` para queries de workspace:
- `src/components/AppLayout.tsx` - Criação automática (causa do loop)
- `src/pages/Index.tsx` - Dashboard principal
- `src/pages/MemberDetails.tsx` - Detalhes do membro
- `src/hooks/usePlanLimits.ts` - Verificação de plano
- `src/components/OnboardingModal.tsx` - Modal de onboarding
- `src/contexts/ImpersonationContext.tsx` - (este está correto, é para outra tabela)

---

## Solução em 2 Etapas

### Etapa 1: Migração de Banco de Dados

Executar SQL para limpar os workspaces duplicados e manter apenas o correto (mais antigo com membros):

```sql
-- 1. Identificar o workspace primário de cada usuário (o mais antigo com membros, ou o mais antigo se nenhum tem membros)
WITH primary_workspaces AS (
  SELECT DISTINCT ON (w.owner_id) 
    w.owner_id,
    w.id as workspace_id
  FROM workspaces w
  LEFT JOIN teams t ON t.workspace_id = w.id
  LEFT JOIN team_members tm ON tm.team_id = t.id
  GROUP BY w.owner_id, w.id, w.created_at
  ORDER BY w.owner_id, COUNT(tm.id) DESC, w.created_at ASC
),
-- 2. Deletar teams dos workspaces duplicados
deleted_teams AS (
  DELETE FROM teams t
  WHERE t.workspace_id IN (
    SELECT w.id FROM workspaces w
    WHERE NOT EXISTS (
      SELECT 1 FROM primary_workspaces pw 
      WHERE pw.workspace_id = w.id
    )
  )
  RETURNING t.id
),
-- 3. Deletar workspaces duplicados
deleted_workspaces AS (
  DELETE FROM workspaces w
  WHERE NOT EXISTS (
    SELECT 1 FROM primary_workspaces pw 
    WHERE pw.workspace_id = w.id
  )
  RETURNING w.id
)
SELECT 
  (SELECT COUNT(*) FROM deleted_teams) as teams_deleted,
  (SELECT COUNT(*) FROM deleted_workspaces) as workspaces_deleted;
```

### Etapa 2: Correção do Código Frontend

Atualizar os 5 arquivos para:
1. Usar `.order('created_at', { ascending: true }).limit(1).single()` ao invés de `.maybeSingle()`
2. Adicionar verificação de existência antes de criar novo workspace

#### Arquivo 1: `src/components/AppLayout.tsx`
```typescript
// Query para verificar workspace do usuário
const { data: workspace, isLoading: workspaceLoading, refetch } = useQuery({
  queryKey: ['user-workspace', user?.id],
  queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    // Se erro de múltiplos registros, não é problema - já temos workspace
    if (error && !error.message.includes('multiple')) throw error;
    return data;
  },
  enabled: !!user,
});
```

#### Arquivo 2: `src/pages/Index.tsx`
```typescript
const { data: workspace } = useQuery({
  queryKey: ['workspace', user?.id],
  queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    if (error) throw error;
    return data as Workspace;
  },
  // ...
});
```

#### Arquivo 3: `src/pages/MemberDetails.tsx`
Mesma correção - adicionar `.order('created_at').limit(1).single()`

#### Arquivo 4: `src/hooks/usePlanLimits.ts`
Mesma correção + adicionar filtro por `owner_id`

#### Arquivo 5: `src/components/OnboardingModal.tsx`
Mesma correção

---

## Resultado Esperado

Após implementação:
- **matheus.magalhaes@fstr.co** verá seu workspace "Faster Ops" com 6 liderados
- **matheus@rhitmo.co** verá seu workspace "Rhitmo Inc. 🙂" com 3 liderados
- Todos os outros usuários continuarão funcionando normalmente
- Novos workspaces só serão criados se o usuário realmente não tiver nenhum

---

## Notas Técnicas

| Componente | Mudança |
|------------|---------|
| `AppLayout.tsx` | Corrigir query + prevenir criação duplicada |
| `Index.tsx` | Usar `.order().limit(1).single()` |
| `MemberDetails.tsx` | Usar `.order().limit(1).single()` |
| `usePlanLimits.ts` | Adicionar filtro `owner_id` + `.order().limit(1)` |
| `OnboardingModal.tsx` | Usar `.order().limit(1)` |
| **Migração SQL** | Limpar ~41.000 workspaces vazios duplicados |
