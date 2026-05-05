
## Objetivo

Substituir o modal `MentorChat` por uma experiência de **página dedicada** estilo Claude/ChatGPT/Windmill: ao enviar a primeira pergunta no launchpad (`/lider/mentor`), o app navega para `/lider/mentor/:threadId` — uma tela cheia focada na conversa, com sidebar de threads à esquerda. Sem dialog, sem wizard.

## Arquitetura de rotas

```
/lider/mentor              → Launchpad (atual: composer + sugestões + recentes)
/lider/mentor/:threadId    → Thread view (conversa fullscreen + sidebar de histórico)
```

Ambas as rotas vivem dentro do `AppLayout` existente (sidebar global do app continua visível). A "sidebar de threads" do mentor fica **dentro** da página, no estilo master-detail (padrão já estabelecido em `master-detail-pages` memory: `MemberMasterList 260px bg-muted/30`).

## Layout da página de thread (`/lider/mentor/:threadId`)

```text
┌─ AppSidebar ─┬─ ThreadList 260px ────┬─ Conversation (flex-1) ──────────────┐
│ (global)     │ + Nova conversa       │ Header: título editável + chips      │
│              │ ─ Hoje                │ (liderado · escopo · "Contexto")     │
│              │   • Updates on Gabi   │ ──────────────────────────────────── │
│              │ ─ Última semana       │ Mensagens (markdown + citações)      │
│              │   • Padrões da Yas    │ ScrollArea fluida                    │
│              │ ─ Anteriores          │ ──────────────────────────────────── │
│              │   ...                 │ Composer fixo no fundo (mesmo do     │
│              │                       │ launchpad: textarea + member/scope)  │
└──────────────┴───────────────────────┴──────────────────────────────────────┘
```

- Title da thread inline-editável no header (clique → input, igual hoje no MentorChat).
- Botão "Contexto" no header abre um Sheet/Drawer lateral com o `ContextPicker` atual (não modal central).
- Sem cabeçalho de Dialog; ocupa `h-[calc(100svh-3rem)]`.

## Mudanças concretas

### 1. Extrair `MentorChatView` (componente puro de conversa)
Criar `src/components/mentor/MentorChatView.tsx` contendo toda a lógica atual de `MentorChat.tsx` **menos** o wrapper `<Dialog>`. Recebe as mesmas props, mas sem `open/onOpenChange`. Inclui:
- Sidebar de threads (com toggle colapsar)
- Lista de mensagens + markdown + citações + edit/copy
- Composer (textarea + attachments + voice + ContextPicker via Sheet)
- Toda a lógica de `handleSend`, streaming, threads CRUD permanece igual

### 2. Criar `src/pages/lider/MentorThread.tsx`
- Lê `:threadId` da URL via `useParams`
- Resolve `memberId` via consulta a `chat_threads` (a thread já guarda `member_id`)
- Renderiza `<MentorChatView initialThreadId={threadId} memberId={...} feedbacks={...} />`
- Botão "Voltar" no canto superior esquerdo → `/lider/mentor` (launchpad)

### 3. Atualizar `src/pages/lider/Mentor.tsx` (launchpad)
- Remover o `<MentorChat>` modal e os states `chatOpen`/`activeThreadId`
- `startChat(prompt, threadId?)`:
  - Se `threadId` existe → `navigate('/lider/mentor/' + threadId)`
  - Se é nova: criar thread agora via `chat_threads.insert` (com `member_id` e título derivado dos primeiros 40 chars do prompt) → navegar para `/lider/mentor/:newId` passando `initialPrompt` via state da rota
- `MentorThread` lê `location.state?.initialPrompt` e dispara o `handleSend` automaticamente no mount

### 4. Adicionar rota em `src/App.tsx`
```tsx
<Route path="/lider/mentor/:threadId" element={Leader(<LiderMentorThread />)} />
```

### 5. Refatorar `MentorChat.tsx` (compatibilidade)
- Vira um wrapper fino: `<Dialog><MentorChatView ... /></Dialog>` — mantém os call-sites antigos (ex.: páginas que ainda abrem o mentor como modal contextual em `MemberDetails`, briefs, etc.) funcionando sem regressão. Só o launchpad passa a usar a página dedicada.

### 6. Histórico no launchpad
- Continuar mostrando "Conversas recentes" no `/lider/mentor`
- Clique numa thread → `navigate('/lider/mentor/' + thread.id)` (sem abrir modal)

## Detalhes técnicos

- **Sidebar collapse**: estado local `sidebarOpen` na ThreadList, com botão `<` (já existe no MentorChat atual).
- **ContextPicker**: hoje é exibido inline no MentorChat. Mover para um `<Sheet side="right">` acionado pelo botão "Contexto" no header (igual ao print do Windmill).
- **Streaming preservado**: a lógica de `chat-mentor` edge function não muda; só o invólucro visual.
- **Mobile**: ThreadList vira drawer (`Sheet side="left"`) em `< md`.
- **Navegação ao criar thread**: `replace: true` para não poluir o histórico do browser entre launchpad → thread.

## Memória a atualizar

Adicionar `mem://design/dashboard/mentor-page-experience.md` documentando:
- `/lider/mentor` = launchpad (composer + recentes)
- `/lider/mentor/:threadId` = thread view fullscreen com master-detail
- Modal `MentorChat` continua disponível para contextos pontuais (member page, briefs)
