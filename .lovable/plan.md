# Plano: Sidebar reordenada + Página "Pergunte ao Mentor" dedicada

## 1. Reordenar sidebar do líder

Em `src/lib/navigation.ts`, atualizar `LEADER_NAV_ITEMS` para esta ordem exata:

1. Início (`Home`)
2. 1:1s (`Calendar`)
3. Diário de Bordo (`BookOpen`)
4. Objetivos (`Target`)
5. Avaliações (`ClipboardList`)
6. Pulse (`Activity`)
7. Contexto (`Layers`)

(Apenas reordenar — todas as rotas já existem.)

## 2. Limpar a sidebar atual

Em `src/components/AppSidebar.tsx`:
- Remover render de `<ThreadsList persona={persona} />` (Zone D) — o histórico migra para a nova página.
- `SidebarFooterCTA` (líder) passa a navegar para `/lider/mentor` em vez de disparar o `open-mentor-chat` event no dashboard. O modal `<MentorChat>` continua existindo para uso pontual (ex.: ficha do liderado), mas deixa de ser o entry-point principal do líder.

## 3. Nova página: `/lider/mentor`

Criar `src/pages/lider/Mentor.tsx` registrada em `src/App.tsx` como rota lazy `Leader(<LiderMentor />)`.

### Layout (referência Windmill da imagem)

```text
┌──────────────────────────────────────────────────────────┐
│ Pergunte à Rhitmo                                        │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │  [Liderado ▾]  [Contexto: Geral ▾]                   │ │
│ │  Pergunte qualquer coisa…                            │ │
│ │                                              [↑]     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Sugestões                                                │
│ [Resumir o último mês]  [Pauta da próxima 1:1]  …        │
│                                                          │
│ Conversas recentes                       Ver tudo →      │
│  💬  Reunião com Ana — preparação        há 2 dias       │
│  💬  Padrões do time — Q1                há 4 dias       │
│  💬  Mirror: contradições semana         há 1 semana     │
└──────────────────────────────────────────────────────────┘
```

Largura `max-w-3xl mx-auto py-8 px-6` (padrão editorial Lora/Inter já existente).

### Seletores no topo do composer

- **Liderado** (`MemberSelectPopover`): popover com lista de liderados ativos do líder (mesma fonte usada em `MemberMasterList`/Contexto). Default = "Sem liderado (chat geral)". Exibir avatar + nome.
- **Contexto** (dropdown simples): opções
  - `Geral` (default): nenhum RAG por liderado, comportamento de "chat genérico"
  - `Notas` (apenas habilitado se liderado selecionado): usa `ContextPicker` existente para escolher notas/feedbacks específicos
  - `Tudo do liderado` (apenas se liderado selecionado): RAG completo (transcrições, pulses, PDIs) — comportamento atual do MentorChat com `memberId`

Estado controlado pelo container da página e injetado no chat.

### Histórico de threads (dentro da página)

- Listar últimas 10 threads `type='mentor'` (e `'general_chat'` quando aplicável) do `chat_threads` para `user_id = effective`.
- Cada item: ícone, título, data relativa; chip pequeno com nome do liderado (quando `member_id` não nulo).
- Botão **Ver tudo** abre drawer com paginação (lista completa, busca por título).
- Clicar numa thread carrega ela no MentorChat embutido (substitui `?thread=` por estado local).

### Reusar MentorChat

Refatorar `MentorChat.tsx` para suportar dois modos:
- **Modal** (atual, mantido para entry-points pontuais como ficha do liderado).
- **Embutido / página** (novo): mesmo componente, mas sem `Dialog` wrapper — render inline. Adicionar prop `variant: 'modal' | 'page'` (default `modal`).

A página `/lider/mentor` passa:
- `variant="page"`
- `userType="leader"`
- `memberId` = id do liderado selecionado (ou `undefined` para chat geral)
- `userId` = effectiveUserId
- `initialThreadId` = thread selecionada do histórico

Quando `memberId` muda, criar nova thread (não trocar o `member_id` de thread existente).

## 4. CTA da sidebar

`SidebarFooterCTA.tsx`:
- Líder: `navigate('/lider/mentor')` (remover o dispatch do evento `open-mentor-chat`).
- Direct report: continua indo para `/liderado/meu-rhitmo`.

## 5. Backend / dados

Sem migração. Estruturas já existem:
- `chat_threads` (`type`, `member_id`, `user_id`)
- `chat_messages`
- Edge function `chat-mentor` já aceita `memberId` opcional → quando ausente entra em modo "chat geral" (já implementado para o trio Brief/Mirror/Nudge).

Validar que `chat-mentor` lida com `memberId=null` retornando resposta sem RAG por liderado. Se não, ajustar branch para system prompt "chat geral de liderança" sem buscar `context_evidence`.

## 6. i18n

Adicionar chaves em `src/i18n/locales/pt-BR.json` (e en/es):
- `mentor.page.title` = "Pergunte à Rhitmo"
- `mentor.page.subtitle` = "Sua copiloto de liderança"
- `mentor.selector.liderado` = "Liderado"
- `mentor.selector.liderado_none` = "Chat geral"
- `mentor.selector.contexto` = "Contexto"
- `mentor.selector.contexto.geral` / `notas` / `tudo`
- `mentor.history.title` = "Conversas recentes"
- `mentor.history.view_all` = "Ver tudo"

## 7. Memória

Atualizar `mem://design/dashboard/home-v3-windmill` (ou criar nova `mem://features/mentor-chat-dedicated-page`) registrando que o Mentor agora vive em `/lider/mentor` com seletor liderado+contexto e histórico embutido.

## Detalhes técnicos

**Arquivos novos**
- `src/pages/lider/Mentor.tsx`
- `src/components/mentor/MentorMemberSelector.tsx` (popover lista liderados)
- `src/components/mentor/MentorContextScopeSelect.tsx` (dropdown geral/notas/tudo)
- `src/components/mentor/MentorThreadsHistory.tsx` (lista últimas + drawer "ver tudo")

**Arquivos editados**
- `src/lib/navigation.ts` — reorder
- `src/components/AppSidebar.tsx` — remover ThreadsList
- `src/components/sidebar/SidebarFooterCTA.tsx` — navegação direta
- `src/App.tsx` — registrar rota `/lider/mentor`
- `src/components/MentorChat.tsx` — prop `variant` modal/page
- `supabase/functions/chat-mentor/index.ts` — confirmar branch `memberId=null` (ajuste se necessário)
- `src/i18n/locales/*.json`

**Comportamento default sem seleção**
- Liderado = nenhum, Contexto = Geral → MentorChat opera como assistente de liderança genérico (sem RAG por pessoa). Reutiliza thread `type='mentor'` com `member_id=null`.

**Comportamento com liderado selecionado**
- Contexto "Geral": RAG genérico do liderado (resumo).
- Contexto "Notas": ativa `ContextPicker` inline para o líder marcar notas específicas.
- Contexto "Tudo": RAG completo (atual).

## Resposta direta às perguntas

- **Reordenar sidebar?** Sim, simples reorder em `navigation.ts`.
- **Subir CTA do mentor?** Já está pinado no footer; vamos manter visível e fazê-lo navegar para a nova página em vez de abrir modal.
- **Página dedicada com histórico?** Sim, `/lider/mentor` com `MentorChat` embutido + lista de threads (e sidebar atual fica limpa).
- **Selecionar liderado + escopo?** Sim, dois seletores no topo do composer; default = chat geral. Totalmente possível porque `MentorChat` + `chat-mentor` já aceitam `memberId` opcional.
