# Reintroduzir Editar/Excluir no feed do Diário de Bordo

## Problema
Na versão atual de `/lider/diario` (feed cross-member), ao expandir uma nota só aparece o botão **"Abrir nota"**, que joga o usuário pra página clássica. As ações **Editar** e **Excluir** existiam antes (no `NoteCard` por liderado) mas não foram portadas pro novo `DiaryFeedItem`.

## Solução (apenas frontend, sem backend/migration)

Adicionar duas ações inline no rodapé da nota expandida em `src/components/leader/diario/DiaryFeedItem.tsx`, do lado esquerdo, mantendo "Abrir nota" à direita:

```
[Editar]  [Excluir]                              [Abrir nota ↗]
```

### 1. Editar
- Botão `variant="ghost"` com ícone `Pencil`.
- Abre o **`NewNoteDialog`** existente em modo edição (ele já aceita `feedbackId` / nota existente — vou confirmar a prop ao implementar e, se faltar, passar via `editingFeedback`).
- Pré-popular: título, conteúdo HTML, tags, visibility, occurred_at, member_id.
- Ao salvar: invalidar `['diario-feedbacks']` e fechar.

### 2. Excluir
- Botão `variant="ghost"` com ícone `Trash2` em `text-destructive`.
- Abre `AlertDialog` de confirmação ("Excluir esta anotação? Esta ação não pode ser desfeita.").
- Confirma → `supabase.from('feedbacks').delete().eq('id', item.id)` (RLS já permite: `manager_id = auth.uid()`).
- Toast de sucesso/erro + invalidar `['diario-feedbacks']` e `['team-members']`.

### 3. Estado no componente
- `DiaryFeedItem` ganha dois estados locais: `editOpen` e `deleteOpen`.
- Como o `NewNoteDialog` provavelmente vive hoje só no nível da página, vou:
  - **Opção A (preferida):** instanciar `NewNoteDialog` dentro do próprio `DiaryFeedItem` (já é um padrão em outros lugares do app) — mantém o componente autônomo.
  - **Opção B:** subir o estado pra `Diario.tsx` via callback `onEdit(item)` se o `NewNoteDialog` não suportar bem múltiplas instâncias. Decidir na hora de implementar olhando o componente.

### 4. Acessibilidade / UX
- Botões com `aria-label` claros.
- `e.stopPropagation()` para não colapsar a linha ao clicar.
- Mantém `opacity-60`/hover atuais.

## Arquivos tocados
- `src/components/leader/diario/DiaryFeedItem.tsx` (principal)
- `src/pages/lider/Diario.tsx` (apenas se precisar elevar estado — Opção B)

## Fora de escopo
- Sem mudanças em RLS, edge functions, schema.
- Sem mexer no `NoteCard` clássico.
- Sem mudar o layout colapsado da linha (só o rodapé do expandido).
