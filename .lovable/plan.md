

## Plano: Reset de Usuario para Teste de Convite

### Estado Atual Identificado

| Entidade | ID | Status |
|----------|----|----|
| **Usuario (auth.users)** | `0a9ef33d-e80e-49e5-9078-f287aeb6d09f` | Email: mth.magalhaes@gmail.com |
| **Workspace** | `1ac62236-5694-4501-94bb-0528b158fea8` | Nome: "BizOps Squad" |
| **Team** | `5a64325a-1f06-46cb-aaba-d44172266594` | Nome: "Sem Time" |
| **Team Members vinculados** | Nenhum | O usuario nao esta como liderado |

### Diagnostico

O usuario `mth.magalhaes@gmail.com` fez **signup como lider** (criou workspace), nao como liderado. Por isso:
- Nao ha `linked_user_id` apontando para ele em `team_members`
- Ele possui um workspace proprio

### Acoes Necessarias (em ordem de execucao)

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. DELETE FROM public.teams                                    │
│     WHERE workspace_id = '1ac62236-...'                         │
│     (Remove o time "Sem Time" - FK constraint)                  │
│                                                                 │
│  2. DELETE FROM public.workspaces                               │
│     WHERE owner_id = '0a9ef33d-...'                             │
│     (Remove o workspace "BizOps Squad")                         │
│                                                                 │
│  3. DELETE FROM auth.users                                      │
│     WHERE id = '0a9ef33d-...'                                   │
│     (Remove completamente o login)                              │
│                                                                 │
│  4. (Opcional) UPDATE public.team_members                       │
│     SET linked_user_id = NULL,                                  │
│         invite_status = 'pending',                              │
│         invite_token = gen_random_uuid()                        │
│     WHERE linked_user_id = '0a9ef33d-...'                       │
│     (Caso exista vinculo em outro workspace)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Implementacao

Vou executar esses comandos usando a Edge Function `admin-delete-user` ou diretamente via SQL no backend.

**Importante**: A delecao do usuario em `auth.users` requer privilégios de `service_role`. Isso sera feito atraves de uma Edge Function existente ou via migration com `SECURITY DEFINER`.

### SQL Completo (para execucao via backend)

```sql
-- Passo 1: Deletar team_members do workspace (se houver)
DELETE FROM public.team_members 
WHERE team_id IN (
  SELECT t.id FROM public.teams t
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE w.owner_id = '0a9ef33d-e80e-49e5-9078-f287aeb6d09f'
);

-- Passo 2: Deletar times do workspace
DELETE FROM public.teams 
WHERE workspace_id = '1ac62236-5694-4501-94bb-0528b158fea8';

-- Passo 3: Deletar workspace
DELETE FROM public.workspaces 
WHERE id = '1ac62236-5694-4501-94bb-0528b158fea8';

-- Passo 4: Limpar vinculos em outros workspaces (se houver)
UPDATE public.team_members 
SET linked_user_id = NULL,
    invite_status = 'pending',
    invite_token = gen_random_uuid()
WHERE linked_user_id = '0a9ef33d-e80e-49e5-9078-f287aeb6d09f';

-- Passo 5: Deletar usuario do auth (requer service_role)
-- Isso sera feito via Edge Function admin-delete-user
```

### Secao Tecnica

#### Edge Function Existente

O projeto ja possui a edge function `admin-delete-user` que pode deletar usuarios do `auth.users`. Vou usa-la para a etapa final.

#### Ordem de Execucao

A ordem e critica devido as foreign keys:
1. `team_members` → depende de `teams`
2. `teams` → depende de `workspaces`  
3. `workspaces` → depende de `auth.users`
4. `auth.users` → raiz

#### Verificacao Pos-Reset

Apos executar, rodar:
```sql
SELECT * FROM auth.users WHERE email = 'mth.magalhaes@gmail.com';
-- Deve retornar 0 linhas
```

### Resultado Esperado

O email `mth.magalhaes@gmail.com` estara completamente limpo do sistema, permitindo:
- Gerar novo convite para esse email
- Usuario fazer signup como liderado
- Testar fluxo completo de onboarding

