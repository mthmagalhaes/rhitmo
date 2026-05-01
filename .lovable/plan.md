## Bug

Clicar numa thread em **MentorHistoryCard** (Home) ou em **ThreadsList** (sidebar) navega para `/chat/:id`. Essa rota **não existe** em `App.tsx`, então cai no 404.

Além disso, ao revisar `MemberDetails`, descobri que o `?openMentor=true` que `handleOpenMentor` passa **também já está quebrado** — `MemberDetails` nunca lê `searchParams`. Hoje só funciona pelo dropdown "Conversar com o Mentor" dentro do próprio MemberDetails.

## Estratégia

`MentorChat` é um Sheet montado dentro de `MemberDetails` e cada thread tem `member_id`. Para abrir uma conversa específica:

1. Buscar o `member_id` da thread
2. Navegar para `/member/{member_id}?tab=chat&thread={threadId}`
3. `MemberDetails` lê o query, abre o Sheet e seta a thread ativa

## Mudanças

### 1. `src/pages/MemberDetails.tsx` — wiring do query param
- Importar `useSearchParams` do `react-router-dom`
- Após `member` carregar, se `openMentor=true` ou `thread=<id>` presente → `setChatOpen(true)`
- Passar nova prop `initialThreadId={searchParams.get('thread')}` para `<MentorChat>`
- Após abrir, limpar o query (`setSearchParams({}, { replace: true })`) para não reabrir em re-renders

### 2. `src/components/MentorChat.tsx` — aceitar thread inicial
- Adicionar `initialThreadId?: string | null` à `MentorChatProps`
- Novo `useEffect` que, quando `open` vira `true` e `initialThreadId` existe, chama `setSelectedThreadId(initialThreadId)` e `setIsCreatingNewThread(false)` (sobrepondo o auto-select da thread mais recente nas linhas 168-171)

### 3. `src/components/dashboard/MentorHistoryCard.tsx` — navegação correta
- Trocar `select` para incluir `member_id`
- Trocar `navigate(`/chat/${thread.id}`)` por `navigate(`/member/${thread.member_id}?tab=chat&thread=${thread.id}`)`
- Se a thread não tiver `member_id` (caso `general_chat`/Slack), fallback para `onOpenMentor()` (que já leva ao primeiro membro)

### 4. `src/components/sidebar/ThreadsList.tsx` — mesma correção
- Incluir `member_id` no select
- Trocar destino para `/member/{member_id}?tab=chat&thread={id}` quando `member_id` existir
- Para `meu_rhitmo` (persona liderado), navegar para `/meu-rhitmo?thread={id}` (e wirar o mesmo padrão lá)

### 5. `src/pages/liderado/MeuRhitmo.tsx` — paridade para o liderado
Aplicar o mesmo wiring de `searchParams.get('thread')` → `initialThreadId` (rápida verificação se ele já tem um MentorChat embutido; se não tiver, fica fora de escopo desta task e `ThreadsList` ignora `meu_rhitmo` por enquanto).

## Fora de escopo

- Criar uma rota `/chat/:id` standalone (cara: precisa montar contexto de membro do zero). Reusar `/member/:id?tab=chat&thread=` é mais barato e respeita a arquitetura atual.
- Refatorar `MentorChat` para virar página própria.
- Schema de banco.

## Arquivos

- editar: `src/pages/MemberDetails.tsx`
- editar: `src/components/MentorChat.tsx`
- editar: `src/components/dashboard/MentorHistoryCard.tsx`
- editar: `src/components/sidebar/ThreadsList.tsx`
- editar (se aplicável): `src/pages/liderado/MeuRhitmo.tsx`
