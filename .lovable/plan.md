

## Correcao: Nome e Avatar do Liderado na Sidebar

### Problema

No `AppSidebar.tsx`, o nome e exibido a partir de `user.user_metadata.full_name`, que pode estar vazio ou generico para liderados. O hook `useLinkedMember` ja busca o `name` correto da tabela `team_members`, mas o valor nao e usado no footer da sidebar.

### Solucao

Editar apenas o `AppSidebar.tsx` -- uma mudanca de 2 linhas:

**Arquivo: `src/components/AppSidebar.tsx`**

1. Extrair `linkedMember` do hook `useLinkedMember` (ja importado, so nao desestruturado)
2. Alterar a variavel `userName` para priorizar `linkedMember?.name` quando disponivel

```text
// Antes:
const { isLinkedMember } = useLinkedMember();
const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuario';

// Depois:
const { isLinkedMember, linkedMember } = useLinkedMember();
const userName = (isLinkedMember && linkedMember?.name) 
  || user?.user_metadata?.full_name 
  || user?.user_metadata?.name 
  || 'Usuario';
```

### O que NAO muda

- Fluxo do lider: quando `isLinkedMember` e `false`, o fallback continua sendo `user_metadata`
- Nenhuma query nova -- o `useLinkedMember` ja faz o SELECT necessario
- Nenhuma alteracao no backend ou em outros componentes
- O `MemberAvatar` ja recebe `memberName` como prop, entao as iniciais serao geradas corretamente a partir do nome real

### Detalhes Tecnicos

- Hook `useLinkedMember` ja retorna `linkedMember.name` via query `team_members.select('id, name, email, role, skills_data').eq('linked_user_id', user.id)`
- A unica edicao e no arquivo `src/components/AppSidebar.tsx`, linhas ~48 e ~70

