

## Plano: Correção de Persistência na Edição de Avaliações

### Problema Identificado

O bug ocorre porque após salvar as edições, o componente `ReviewViewDialog` continua exibindo os dados antigos. A causa raiz está em dois locais:

| Local | Problema |
|-------|----------|
| `ReviewViewDialog.tsx` | Não invalida cache após salvar, depende apenas de `onReviewUpdated()` |
| `PerformanceReviewList.tsx` | `selectedReview` mantém dados antigos mesmo após `loadReviews()` atualizar a lista |

### Fluxo Atual (Bug)

```text
1. Usuário edita avaliação no TipTap
2. Clica "Salvar Alterações"
3. handleSave() → supabase.update() → OK
4. onReviewUpdated() → loadReviews() → Atualiza array reviews[]
5. setEditing(false) → Modo visualização
6. PROBLEMA: selectedReview ainda tem dados antigos!
7. Usuário vê conteúdo original, não o editado
```

---

### Solução

#### Parte 1: Migrar PerformanceReviewList para React Query

Trocar o estado local por React Query para que a invalidação funcione corretamente:

**Estado atual:**
```typescript
const [reviews, setReviews] = useState<PerformanceReview[]>([]);
const loadReviews = async () => { ... setReviews(data); }
```

**Novo estado:**
```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const { data: reviews = [], isLoading } = useQuery({
  queryKey: ['performance-reviews', memberId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select('id, title, content, coaching_tip, period_type, created_at')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
});
```

#### Parte 2: Atualizar selectedReview após reload

Criar efeito para sincronizar `selectedReview` quando os dados mudam:

```typescript
// Sincronizar selectedReview quando reviews atualizar
useEffect(() => {
  if (selectedReview && reviews.length > 0) {
    const updated = reviews.find(r => r.id === selectedReview.id);
    if (updated && updated.content !== selectedReview.content) {
      setSelectedReview(updated);
    }
  }
}, [reviews, selectedReview]);
```

#### Parte 3: Adicionar invalidação no ReviewViewDialog

```typescript
import { useQueryClient } from '@tanstack/react-query';

// Dentro do componente
const queryClient = useQueryClient();

// No handleSave, após sucesso:
const handleSave = async () => {
  // ... validação ...
  
  try {
    const { error } = await supabase
      .from('performance_reviews')
      .update({ title: editedTitle.trim(), content: editedContent.trim() })
      .eq('id', review.id);

    if (error) throw error;

    // NOVO: Invalidar cache para forçar refetch
    await queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });

    toast({ title: "Avaliação atualizada! ✅", ... });
    
    onReviewUpdated();
    setEditing(false);
  } catch (error) { ... }
};
```

#### Parte 4: Corrigir Export PDF para HTML

O PDF export atualmente usa `marked(review.content)` que converte Markdown para HTML. Se o conteúdo já for HTML (editado pelo TipTap), isso causa problemas.

```typescript
const handleExportPDF = () => {
  // ...
  
  // ANTES (linha 69):
  const htmlContent = marked(review.content);
  
  // DEPOIS:
  const htmlContent = review.content.includes('</')
    ? review.content  // Já é HTML, usar direto
    : marked(review.content); // É Markdown, converter
  
  // ... resto igual ...
};
```

#### Parte 5: Atualizar callbacks no PerformanceReviewList

Trocar `loadReviews` por invalidação de cache:

```typescript
// Callbacks para os dialogs
const handleReviewUpdated = () => {
  queryClient.invalidateQueries({ queryKey: ['performance-reviews', memberId] });
};

const handleReviewDeleted = () => {
  queryClient.invalidateQueries({ queryKey: ['performance-reviews', memberId] });
  setSelectedReview(null);
};

// No JSX:
<ReviewViewDialog
  // ...
  onReviewUpdated={handleReviewUpdated}
  onReviewDeleted={handleReviewDeleted}
/>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `PerformanceReviewList.tsx` | Migrar para React Query, sincronizar selectedReview |
| `ReviewViewDialog.tsx` | Adicionar invalidateQueries após save, corrigir PDF export |

---

### Seção Técnica

**Query Key consistente:**
```typescript
// Em ambos os arquivos usar:
queryKey: ['performance-reviews', memberId]
```

**Novo fluxo (Corrigido):**
```text
1. Usuário edita avaliação no TipTap
2. Clica "Salvar Alterações"
3. handleSave() → supabase.update() → OK
4. invalidateQueries(['performance-reviews']) → Cache limpo
5. onReviewUpdated() → (opcional, backup)
6. React Query refetch automático → reviews[] atualizado
7. useEffect detecta mudança → selectedReview atualizado
8. setEditing(false) → Modo visualização com dados NOVOS ✓
```

**Imports necessários em ReviewViewDialog.tsx:**
```typescript
import { useQueryClient } from '@tanstack/react-query';
```

**Imports necessários em PerformanceReviewList.tsx:**
```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

