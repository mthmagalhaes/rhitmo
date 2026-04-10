

## Corrigir: Vídeo demo aparecendo para liderados

### Problema
Na tela do liderado em `/dashboard/perfil`, o vídeo do YouTube "Veja como gerenciar seu time em 2 minutos" aparece no estado vazio. Esse conteúdo é voltado para líderes e não faz sentido para liderados.

Isso acontece porque um usuário que é tanto liderado (linked member) quanto tem acesso como líder (ou simplesmente não está corretamente vinculado) cai na view de líder do `Index.tsx`, que mostra o vídeo demo quando não há membros no time.

### Solução

**1. `src/pages/Index.tsx` — Condicionar o vídeo demo ao papel de líder**

No trecho do empty state (linhas ~549-558), verificar se o usuário é um linked member antes de mostrar o vídeo. Se for um liderado sem time próprio, mostrar uma mensagem adequada em vez do vídeo de onboarding de líder.

Importar `useLinkedMember` (já importado) e usar `isLinkedMember` para:
- Se `isLinkedMember === true` e caiu na view de líder: não mostrar vídeo, mostrar mensagem neutra ou redirecionar para a view de liderado
- Se `isLinkedMember === false` (é líder): manter o vídeo demo atual

**2. Validação adicional**

Verificar se o `isLinkedMember` já está sendo usado no componente Index e garantir que a lógica de redirecionamento na linha 325 cubra o caso de `/dashboard/perfil` com `activeTab`.

### Arquivos alterados
- `src/pages/Index.tsx` — Condicionar empty state com vídeo ao role de líder

