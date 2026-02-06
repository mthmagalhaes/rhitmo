

## Plano: Remover Workspace Acidental "COO"

### Estado Atual Identificado

| Entidade | ID | Status |
|----------|----|----|
| **Usuario** | `6f9335e3-03ab-4d48-8ae7-2841db6b6660` | mth.magalhaes@gmail.com |
| **Workspace Acidental** | `37ca4f2a-b624-4042-901c-c9067a753bcf` | Nome: "COO" (a ser deletado) |
| **Time do Workspace** | `c74efdcd-45da-4f6f-a088-b72b868d16b7` | "Sem Time" - 0 membros |
| **Convites existentes** | 2 registros em `team_members` | Ja estao com `pending` e sem vinculo |

### Diagnostico

O usuario `mth.magalhaes@gmail.com` criou acidentalmente o workspace "COO" apos aceitar o convite. Os registros de `team_members` (onde ele deveria ser liderado) ja foram resetados anteriormente - estao com `linked_user_id = NULL` e `invite_status = 'pending'`.

**Problema**: Quando ele loga, o sistema encontra um workspace proprio e renderiza o dashboard de lider ao inves de permitir que ele aceite o convite de liderado.

### Acao Necessaria

Deletar o workspace "COO" e seu time vazio:

```sql
-- Passo 1: Deletar o time vazio do workspace acidental
DELETE FROM public.teams 
WHERE workspace_id = '37ca4f2a-b624-4042-901c-c9067a753bcf';

-- Passo 2: Deletar o workspace acidental
DELETE FROM public.workspaces 
WHERE id = '37ca4f2a-b624-4042-901c-c9067a753bcf';
```

### Resultado Esperado

Apos a execucao:
- Usuario `mth.magalhaes@gmail.com` continuara existindo (login/senha mantidos)
- Ao logar, nao tera workspace proprio
- O `AppLayout.tsx` detectara `isLinkedMember = false` e `workspace = null`
- Podera acessar o link de convite existente e aceitar novamente
- Sera redirecionado para o fluxo de onboarding de liderado

### Links de Convite Disponiveis

Dois convites ja existem para este email:
- **Maria Silva** (Customer Success): `/invite?token=99d0fadc-760c-4e5b-a3cd-7972db16dfbe`
- **MM** (BizOps): `/invite?token=5986f6b3-c26b-42ad-966c-3c0298bed069`

Matheus podera copiar qualquer um desses links e enviar para o usuario testar o fluxo.

### Secao Tecnica

A ordem de delecao respeita as foreign keys:
1. `teams` depende de `workspaces` (FK workspace_id)
2. Deletar teams primeiro, depois workspace

Nao ha team_members vinculados ao workspace "COO", entao nao ha risco de perda de dados.

