## Contexto

A página `/lider/diario` **já está em Master-Detail** (Sprint 12.1) com `MemberMasterList` à esquerda e detalhe à direita. O que ainda não bate com o pedido:

1. **Falta banner de privacidade fixo** no topo da coluna direita (cadeado + "Diário Privado. Estas anotações são 100% confidenciais…").
2. **Captura rápida ainda usa modal** (`NewNoteDialog` aberto via botão "Nova nota"). Precisa virar Textarea inline sempre visível com botão "Salvar nota".
3. **Empty state "sem notas"** ainda chama o modal — precisa apontar para o Quick Input.
4. **Troca de liderado pisca a tela** porque `useQuery` zera o cache visualmente — falta `placeholderData: (prev) => prev`.

## Mudanças

### 1. Novo `src/components/diario/QuickPrivateNoteInput.tsx`
Captura rápida inline, sem modal:
- `Textarea` `min-h-[100px]` sempre visível com placeholder `Anotação privada sobre {primeiroNome}…`
- Botão **"Salvar nota"** (disabled quando vazio); atalho **⌘/Ctrl + Enter** envia
- INSERT em `feedbacks` reusando exatamente os campos do `NewNoteDialog`:
  - `manager_id`, `member_id`, `content`, `type: 'neutral'`, `occurred_at: now`, `tags: ['diario-bordo']`, `title: 'Anotação do diário'`, `visibility: 'private_leader'`, `source: 'manual'`
- Após save: limpa o textarea + `queryClient.invalidateQueries(['feedbacks', memberId])`
- Visual: card `rounded-2xl bg-card`, header com `PenSquare` + "Captura rápida"

### 2. Refatorar `src/pages/lider/Diario.tsx`
Coluna direita reordenada (mantendo o eyebrow + header do liderado):
1. Eyebrow "DIÁRIO DE BORDO"
2. Header (avatar + nome + cargo) — **remover botão "Nova nota"** (não abre mais modal)
3. **Banner de privacidade** fixo: `rounded-xl bg-muted/60 border border-border/60 px-3.5 py-2.5`, ícone `Lock` + texto "**Diário privado.** Estas anotações são 100% confidenciais e visíveis apenas para você."
4. **`QuickPrivateNoteInput`** sempre visível
5. `FeedbackFilters` (só quando `feedbacks.length > 0`)
6. Feed cronológico (`FeedbackTimeline`) ou empty state textual ("Você ainda não tem anotações privadas para {nome}. Que tal registrar a primeira observação acima?")

Outras melhorias:
- Remover `import NewNoteDialog` e o estado `dialogOpen` (não é mais usado)
- Adicionar `placeholderData: (prev) => prev` no `useQuery` para evitar piscar ao trocar liderado
- Empty state sem liderado: trocar para "Selecione alguém na lista ao lado para acessar suas anotações privadas" (texto pedido)

### 3. Atualizar memória
Em `.lovable/memory/design/dashboard/master-detail-pages.md`, adicionar bloco específico de `/lider/diario` (Sprint 12.3): banner de privacidade, captura rápida sem modal, `placeholderData` para evitar flicker. E atualizar o índice (`mem://index.md`) com a referência atualizada.

## Fora de escopo

- Não altero schema (continua `feedbacks` + `visibility='private_leader'`)
- Não mexo em `NewNoteDialog` (ainda é usado em `MemberDetails` e outras telas)
- Não mexo em `MemberMasterList`, `EmptyMemberDetail`, `FeedbackTimeline`, `FeedbackFilters`
- Não mexo em `/lider/1on1s`, `/lider/objetivos`

## Arquivos

- novo: `src/components/diario/QuickPrivateNoteInput.tsx`
- editar: `src/pages/lider/Diario.tsx`
- editar: `.lovable/memory/design/dashboard/master-detail-pages.md`
- editar: `mem://index.md` (uma linha)
