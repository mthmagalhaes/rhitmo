## O que mudar

Adicionar um botão `⋯` (três pontinhos) sempre visível à direita de cada linha de anotação em `/lider/diario`, abrindo um `DropdownMenu` com as ações que existiam antes. Tudo fica no componente `src/components/leader/diario/DiaryFeedItem.tsx` — a página `Diario.tsx` não muda.

## Ações do menu

1. **Renomear título** — abre um pequeno `Dialog` só com `Input` do título + Salvar (UPDATE em `feedbacks.title`).
2. **Editar nota** — reusa o `Dialog` de edição completo que já existe (título, conteúdo Tiptap, tags, data do fato).
3. **Copiar para outro liderado** — abre `Dialog` com `Select` listando os liderados do líder (usa `useLeaderMembers`), opção "manter data original" (default ON) e botão "Duplicar". Faz INSERT em `feedbacks` clonando `title`, `content`, `tags`, `visibility`, `occurred_at`, trocando `member_id` para o escolhido e mantendo `manager_id = auth.uid()`. Toast "Nota copiada para {Nome}" com botão "Abrir".
4. **Copiar texto** — `navigator.clipboard.writeText(stripHtml(content))` + toast.
5. **Abrir nota** — mesma navegação do botão atual (`/lider/diario?member=...#id`).
6. Separador.
7. **Excluir** — abre o `AlertDialog` de confirmação já existente.

## UX

- Botão `⋯` (`MoreHorizontal`, `h-7 w-7`, `variant="ghost"`) entra antes do `ChevronDown`, com `onClick` que faz `e.stopPropagation()` para não togglar o expand.
- Os botões inline "Editar" e "Excluir" dentro da área expandida são removidos (ficam só "Abrir nota" + ações via menu) para evitar duplicação.
- `DropdownMenuItem` de excluir com `text-destructive`.

## Arquivos

- Editar apenas `src/components/leader/diario/DiaryFeedItem.tsx`:
  - importar `DropdownMenu*`, `MoreHorizontal`, `Copy`, `Users`, `Type`, `useLeaderMembers`.
  - novo `state` para `renameOpen`, `cloneOpen`, `cloneTargetId`, `cloneKeepDate`.
  - handlers `handleRename`, `handleClone`, `handleCopyText`.
  - novo `Dialog` de renomear e `Dialog` de "Copiar para outro liderado".
  - injetar o `DropdownMenu` no header colapsado.

## Fora de escopo

- Mover a nota (apenas copiar, conforme o histórico de comportamento).
- Compartilhar com o liderado (já é fluxo separado pelo botão de visibility).
- Mudanças visuais no resto da página.
