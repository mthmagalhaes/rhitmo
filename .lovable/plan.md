

## Tornar matheus@rhitmo.co somente HR Admin

### Situação atual

- matheus@rhitmo.co (`032f8a17`) é `owner_id` do workspace "Rhitmo Inc." → sistema vê como **leader**
- O `hr_admin_ids` contém apenas `matheus_hr@rhitmo.co` (`e708e033`)
- Por isso ele vê a tela de líder (dashboard) e não a de RH Admin

### Solução

**Uma única operação no banco**: adicionar o user ID de matheus@rhitmo.co ao array `hr_admin_ids` do workspace.

O hook `useUserRole` já verifica `hr_admin_ids` antes de `owner_id`, então ao adicionar o ID dele no array, o sistema automaticamente:
- Retorna role = `hr_admin`
- Redireciona para `/hr` no login
- Mostra a navegação de RH Admin na sidebar

Não é necessário deletar o workspace — ele continua como owner (necessário para RLS de dados), mas a UI o trata como HR Admin.

### Execução

| Ação | Detalhe |
|------|---------|
| UPDATE via insert tool | Adicionar `032f8a17-674e-4ef2-a9c1-8da1bea7338c` ao `hr_admin_ids` do workspace `d6226a14-2e20-40b0-a212-392dfff60623` |

Nenhuma alteração de código necessária — a lógica já prioriza HR Admin sobre Leader.

