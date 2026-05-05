## Problema

Quando o líder começa um chat via **Pergunte ao Mentor → escolhe liderado → faz a pergunta**, aparecem **duas conversas idênticas** no histórico (ver screenshot: "Giovanna está indo be,?" duplicada em "Hoje").

## Causa raiz

O fluxo cria a thread **duas vezes**:

1. **`src/pages/lider/Mentor.tsx`** (launchpad) — `startNewChat` faz `INSERT` em `chat_threads` (linha 149-153) e navega para `/lider/mentor/:threadId` passando `initialPrompt` no state.
2. **`src/pages/lider/MentorThread.tsx`** monta `<MentorChat>` com `initialThreadId={threadId}` + `autoSendInitialPrompt={true}` + `initialPrompt`.
3. Em `MentorChat.tsx`:
   - Effect (linha 238) faz `setSelectedThreadId(initialThreadId)` — mas é assíncrono (próximo render).
   - Effect (linha 293) com `autoSendInitialPrompt` dispara `setTimeout(() => handleSend(initialPrompt), 50)` capturando o `handleSend` do render atual, onde `selectedThreadId` **ainda é `null`**.
   - Em `handleSend` (linha 474): `currentThreadId = selectedThreadId` (= `null`) → condição `!currentThreadId || isCreatingNewThread` → chama `createThread` (linha 479) → **cria uma segunda thread** com o mesmo título.

Resultado: 2 rows em `chat_threads` com mesmo título; a URL aponta pra primeira (que fica vazia), e as mensagens vão pra segunda — daí a duplicação visual e a sensação de "história fantasma".

## Correção

Mudança mínima e cirúrgica em **`src/components/MentorChat.tsx`**:

```ts
// linha 474
let currentThreadId = selectedThreadId ?? initialThreadId ?? null;
```

Assim, mesmo se o `setSelectedThreadId(initialThreadId)` ainda não propagou no momento do `handleSend` auto-disparado, usamos a thread já criada pelo launchpad — e o ramo `if (!currentThreadId || isCreatingNewThread)` não cria duplicata.

Como `isCreatingNewThread` permanece `false` (effect da linha 238 já executou seu `setIsCreatingNewThread(false)` antes do segundo render que dispara o setTimeout, e o estado inicial já é `false`), a condição não dispara `createThread`.

### Limpeza opcional (mesma PR)

- **Threads órfãs já criadas em produção** (sem mensagens, mesmo título duplicado): adicionar uma migration que faz `DELETE FROM chat_threads WHERE NOT EXISTS (SELECT 1 FROM mentor_messages WHERE thread_id = chat_threads.id) AND created_at > now() - interval '60 days' AND type = 'mentor';` para limpar o lixo histórico do bug.

## Arquivos afetados

- `src/components/MentorChat.tsx` — 1 linha alterada (linha 474).
- `supabase/migrations/<timestamp>_cleanup_orphan_mentor_threads.sql` — opcional, limpa duplicatas históricas.

## Fora de escopo

- Nenhuma mudança em `Mentor.tsx`, `MentorThread.tsx`, edge functions ou prompt — só o bug de duplicação.
