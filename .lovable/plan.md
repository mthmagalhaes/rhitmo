

## Plano: Vinculo Manual de Liderado (Force Link)

### Estado Atual Identificado

| Entidade | ID | Valor |
|----------|----|----|
| **Usuario Auth** | `6f9335e3-03ab-4d48-8ae7-2841db6b6660` | mth.magalhaes@gmail.com |
| **Team Member (Matheus)** | `d7da97b1-4427-4e8b-8c6c-0b4c14c6bd66` | Workspace: Faster Ops |
| **Team Member (MM)** | `7a4c1b65-f145-4d00-8b8e-8e0100cc31c7` | Workspace: Rhitmo Inc. |
| **Team Member (Maria)** | `1e0dbb69-1389-4770-bfcc-ab1d6d9e0e98` | Workspace: Rhitmo Inc. |

### Problema

Existem **3 convites pendentes** para o mesmo email em workspaces diferentes. O usuario esta logado mas nenhum tem `linked_user_id` preenchido, entao `isLinkedMember` retorna `false` e ele ve o modal de criar workspace.

### Decisao Necessaria

Qual dos 3 registros deve ser vinculado ao usuario?

**Opcao A (Recomendada)**: Vincular ao registro mais recente "Matheus" no workspace **Faster Ops**
- Member ID: `d7da97b1-4427-4e8b-8c6c-0b4c14c6bd66`

**Opcao B**: Vincular ao registro "MM" no workspace **Rhitmo Inc.**
- Member ID: `7a4c1b65-f145-4d00-8b8e-8e0100cc31c7`

**Opcao C**: Vincular ao registro "Maria Silva" no workspace **Rhitmo Inc.**
- Member ID: `1e0dbb69-1389-4770-bfcc-ab1d6d9e0e98`

### Acao SQL (Assumindo Opcao A)

```sql
-- Vincular usuario ao team_member "Matheus" no Faster Ops
UPDATE public.team_members
SET 
  linked_user_id = '6f9335e3-03ab-4d48-8ae7-2841db6b6660',
  invite_status = 'accepted',
  invite_token = NULL
WHERE id = 'd7da97b1-4427-4e8b-8c6c-0b4c14c6bd66';
```

### Limpeza Opcional

Remover convites duplicados para evitar confusao futura:

```sql
-- Remover convites duplicados (manter apenas o vinculado)
DELETE FROM public.team_members
WHERE email = 'mth.magalhaes@gmail.com'
  AND id != 'd7da97b1-4427-4e8b-8c6c-0b4c14c6bd66';
```

### Resultado Esperado

Apos execucao:
- `useLinkedMember` retornara `isLinkedMember = true`
- `needsOnboarding` dependera se `skills_data.onboarding_completed` esta preenchido
- Usuario sera redirecionado para onboarding ou DirectReportDashboard
- Modal de criar workspace nao aparecera mais

### Secao Tecnica

O hook `useLinkedMember` faz a query:
```typescript
.from('team_members')
.select('id, name, email, role, skills_data')
.eq('linked_user_id', user.id)
.maybeSingle()
```

Ao preencher `linked_user_id`, esta query retornara o registro e `isLinkedMember` sera `true`.

