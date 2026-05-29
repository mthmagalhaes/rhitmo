## Diagnóstico

A thread `5e3fd50a…` está corretamente vinculada à Gabriela (`member_id` salvo, 57 feedbacks no banco, `work_style_data` preenchido, Matheus é `leader_user_id` do time Business Ops). O backend não está com bug — ele recebeu `mode='leader_self'` e respondeu como coach pessoal, por isso veio "sem citações", "sem acesso ao histórico" e "não conheço o perfil (Rhitmo Sync)".

### Causa raiz (race condition no frontend)

`src/pages/lider/MentorThread.tsx` resolve o liderado assim:

```ts
const { members } = useLeaderMembers();           // assíncrono
const member = members.find(m => m.id === thread.member_id) ?? null;
```

E monta o `<MentorChat>` assim que `threadLoading` termina — **sem esperar `useLeaderMembers().isLoading` nem a query de `memberFeedbacks**`. Quando o launchpad navega com `state.initialPrompt`, o `MentorChat` dispara `autoSendInitialPrompt` imediatamente (useEffect em `MentorChat.tsx:298`, sem depender de `memberId`).

No `MentorChat.tsx:533`:

```ts
mode: isLeader && !memberId ? 'leader_self' : 'member',
```

Se `members` ainda está carregando, `member` é `null` → `memberId=undefined` e `feedbacks=[]` → o send vai com `mode='leader_self'`. O backend (`chat-mentor`) então pula RAG, pula `feedbacks`, pula `workStyleData` e responde como coach pessoal do líder — exatamente o comportamento mostrado no print.

Isso afeta **todo líder** que abre o Mentor pelo launchpad com prompt inicial enquanto a lista de liderados ainda carrega — não é específico do Matheus/Gabriela.

## Correção

Arquivo único: `src/pages/lider/MentorThread.tsx`.

1. Pegar também `isLoading` de `useLeaderMembers()`.
2. Pegar `isLoading` da query `memberFeedbacks` (renomear para `feedbacksLoading`).
3. Estender o gate de loading (já existente, hoje só `threadLoading`) para:
  ```
   threadLoading
     || (thread?.member_id && membersLoading)
     || (thread?.member_id && feedbacksLoading)
  ```
   Enquanto isso, mostra o spinner que já existe. Só monta o `<MentorChat>` quando `member` e `memberFeedbacks` estão prontos.
4. Quando `thread.member_id` existe mas `member` não foi encontrado em `members` após carregar (liderado arquivado, fora de escopo etc.), mostrar estado de erro discreto em vez de cair silenciosamente em coach mode (evita o mesmo sintoma reaparecer disfarçado).

Nenhuma mudança em `MentorChat.tsx`, no edge `chat-mentor`, no schema, em RLS ou em prompts. A alma e o RAG já estão corretos — só estavam recebendo o `mode` errado por race condition.  


# Não mudar

A estrutura visual de hoje.

## Validação

1. Abrir `/lider/mentor`, clicar em Gabriela, digitar "Como dar feedback difícil para Gabriela?" e enviar.
2. Resposta deve citar evidências `[doc:UUID]`, referenciar notas reais (ex.: sync 27/05, 1:1 04/05) e usar o Rhitmo Sync dela (chronotype, feedback_style etc.).
3. Conferir nos logs do `chat-mentor`: `mode='member'`, `feedbacksCount > 0`, `evidence_breakdown.from_recent > 0`.
4. Repetir com outro liderado para confirmar que vale para qualquer par líder/liderado.