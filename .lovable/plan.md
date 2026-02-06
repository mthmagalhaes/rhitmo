

## Plano: Ajuste de Titulo e Barra de Filtros (Tactiq Style)

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/MemberDetails.tsx` | Renomear titulo para "Minhas anotacoes", adicionar estados de filtro, logica de filtragem, integrar FeedbackFilters |
| `src/components/FeedbackFilters.tsx` | **NOVO** - Barra de ferramentas com busca, filtros de tag e ordenacao |

---

### Parte 1: Renomeacao Cirurgica

#### Localizacao Atual (Linha 504)
```tsx
<h2 className="text-2xl font-bold text-foreground mb-6">Histórico de Feedbacks</h2>
```

#### Nova Versao
```tsx
<h2 className="text-2xl font-bold text-foreground mb-4">Minhas anotações</h2>
```

A Tab "Diario de Bordo" (linha 494) permanece inalterada.

---

### Parte 2: Novo Componente FeedbackFilters.tsx

#### 2.1 Interface e Props

```typescript
interface FeedbackFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  sortOrder: 'newest' | 'oldest';
  onSortChange: (order: 'newest' | 'oldest') => void;
}
```

#### 2.2 Layout Visual (Tactiq Style)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Pesquisar por palavras-chave...  │ 🎯1:1 │ 🚀PDI │ ✅Check-in │ 🚨Feedback │ ▼ Mais recentes │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 2.3 Estrutura do Componente

```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 p-3 bg-muted/30 rounded-lg border">
  {/* Input de Busca */}
  <div className="relative flex-1 min-w-0 w-full sm:w-auto">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input 
      placeholder="Pesquisar por palavras-chave..."
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      className="pl-9 h-9"
    />
  </div>
  
  {/* Filtros de Tags (Toggle Buttons) */}
  <div className="flex items-center gap-1.5 flex-wrap">
    {FILTER_TAGS.map(tag => (
      <Button
        key={tag.key}
        variant={selectedTags.includes(tag.key) ? "default" : "outline"}
        size="sm"
        onClick={() => toggleTag(tag.key)}
        className="h-8 text-xs gap-1"
      >
        {tag.emoji} {tag.label}
      </Button>
    ))}
  </div>
  
  {/* Select de Ordenacao */}
  <Select value={sortOrder} onValueChange={onSortChange}>
    <SelectTrigger className="w-[140px] h-9">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="newest">Mais recentes</SelectItem>
      <SelectItem value="oldest">Mais antigos</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### 2.4 Tags para Filtro

Conforme solicitado, usar 4 tags principais:

```typescript
const FILTER_TAGS = [
  { key: '1:1', emoji: '🎯', label: '1:1' },
  { key: 'PDI', emoji: '🚀', label: 'PDI' },
  { key: 'Check-in', emoji: '✅', label: 'Check-in' },
  { key: 'Feedback Difícil', emoji: '🚨', label: 'Feedback' },
];
```

---

### Parte 3: Logica de Filtragem em MemberDetails.tsx

#### 3.1 Novos Estados

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
```

#### 3.2 Funcao de Filtragem (useMemo)

```typescript
const filteredFeedbacks = useMemo(() => {
  let result = [...feedbacks];
  
  // 1. Filtro de Busca (title OU content)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(fb => {
      const titleMatch = fb.title?.toLowerCase().includes(query);
      // Para content, remover HTML antes de buscar
      const plainContent = fb.content.replace(/<[^>]*>/g, '').toLowerCase();
      const contentMatch = plainContent.includes(query);
      return titleMatch || contentMatch;
    });
  }
  
  // 2. Filtro de Tags (OR logic - pelo menos uma tag selecionada)
  if (selectedTags.length > 0) {
    result = result.filter(fb => 
      fb.tags?.some(tag => selectedTags.includes(tag))
    );
  }
  
  // 3. Ordenacao por data
  result.sort((a, b) => {
    const dateA = new Date(a.occurred_at || a.created_at).getTime();
    const dateB = new Date(b.occurred_at || b.created_at).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
  
  return result;
}, [feedbacks, searchQuery, selectedTags, sortOrder]);
```

#### 3.3 Integracao no JSX

```tsx
<TabsContent value="diary">
  <div>
    <h2 className="text-2xl font-bold text-foreground mb-4">Minhas anotações</h2>
    
    {feedbacks.length > 0 && (
      <FeedbackFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
      />
    )}
    
    {feedbacks.length === 0 ? (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground mb-4">Nenhum feedback registrado ainda</p>
        <Button onClick={() => setDialogOpen(true)}>Adicionar Primeira Nota</Button>
      </Card>
    ) : filteredFeedbacks.length === 0 ? (
      {/* Estado vazio apos filtragem */}
      <Card className="p-8 text-center border-dashed">
        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhuma anotação encontrada para estes filtros.</p>
        <Button 
          variant="link" 
          onClick={() => { setSearchQuery(''); setSelectedTags([]); }}
          className="mt-2"
        >
          Limpar filtros
        </Button>
      </Card>
    ) : (
      <FeedbackTimeline feedbacks={filteredFeedbacks} onDelete={handleDeleteFeedback} />
    )}
  </div>
</TabsContent>
```

---

### Parte 4: Estados Visuais

#### Barra de Filtros (Estado Normal)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Pesquisar por palavras-chave... │ [🎯 1:1] [🚀 PDI] [✅ Check-in] [🚨 Feedback] │ Mais recentes ▼ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Barra com Filtro Ativo

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 "promoção"                      │ [🎯 1:1]●[🚀 PDI] [✅ Check-in] [🚨 Feedback] │ Mais recentes ▼ │
└─────────────────────────────────────────────────────────────────────────────────┘
```
(O botao "1:1" fica preenchido/primary quando ativo)

#### Estado Vazio apos Filtro

```text
┌──────────────────────────────────────┐
│           🔍                        │
│  Nenhuma anotação encontrada        │
│  para estes filtros.                │
│                                      │
│  [Limpar filtros]                   │
└──────────────────────────────────────┘
```

---

### Secao Tecnica

#### Dependencias Utilizadas

- `lucide-react`: Search icon (ja instalado)
- `@/components/ui/input`: Input de busca (ja existe)
- `@/components/ui/select`: Dropdown de ordenacao (ja existe)
- `@/components/ui/button`: Toggles de tag (ja existe)

#### Performance

- `useMemo` para evitar re-calcular filteredFeedbacks em cada render
- Filtragem client-side (dados ja carregados via React Query)
- Nao impacta chamadas ao banco de dados

#### Logica de Toggle de Tags

```typescript
const toggleTag = (tag: string) => {
  setSelectedTags(prev => 
    prev.includes(tag) 
      ? prev.filter(t => t !== tag)  // Remove se ja existe
      : [...prev, tag]               // Adiciona se nao existe
  );
};
```

#### Busca Case-Insensitive com Limpeza de HTML

```typescript
// Remover tags HTML do content antes de buscar
const plainContent = fb.content.replace(/<[^>]*>/g, '').toLowerCase();
```

