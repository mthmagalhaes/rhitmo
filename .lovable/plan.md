

## Editar Nota no Diário de Bordo

### Problema
O menu contextual do card de feedback (⋮) tem "Compartilhar", "Replicar" e "Excluir", mas não tem opção de editar. O líder não consegue corrigir título, conteúdo ou tags de uma nota já criada.

### Solução
Adicionar uma opção "Editar" no dropdown menu que abre um Dialog com os campos editáveis (título, conteúdo via RichTextEditor, tags, data do fato). Ao salvar, atualiza o registro no banco e recarrega a timeline.

### Plano

**1. `FeedbackTimeline.tsx`**
- Adicionar estado para controlar o dialog de edição (`editingFeedback`, `editedTitle`, `editedContent`, `editedTags`, `editedOccurredAt`)
- Adicionar `<DropdownMenuItem>` "Editar" com ícone `Pencil` no menu contextual, entre "Compartilhar" e "Replicar"
- Adicionar `<Dialog>` de edição com:
  - Input para título
  - `RichTextEditor` para conteúdo
  - Seletor de tags (badges clicáveis, reutilizando `VALID_TAGS` de `tagConfig`)
  - Date picker para `occurred_at`
- Handler `handleSave` que faz `supabase.from('feedbacks').update(...)` e chama callback de refresh
- Adicionar prop `onEdit?: (id: string) => void` ou callback interno com invalidação de query

**2. Props e callback**
- Adicionar nova prop `onFeedbackUpdated?: () => void` ao `FeedbackTimelineProps` para que o componente pai (MemberDetails) recarregue os dados após a edição
- Alternativa: usar `useQueryClient().invalidateQueries` diretamente no componente

### Detalhes técnicos
- Importar `Pencil` do lucide-react, `VALID_TAGS` do tagConfig, `Calendar`/`Popover` para date picker
- O update no Supabase usa `.update({ title, content, tags, occurred_at }).eq('id', feedbackId)`
- Conteúdo pode ser HTML (TipTap) ou texto puro — inicializar o editor conforme o formato existente

