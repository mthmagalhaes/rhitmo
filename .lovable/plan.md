

## Plano: Smart Context (Auto-Tags + Auto-Title + Tratamento de Legado)

### Visão Geral

Expandir o sistema de Smart Tags para incluir:
1. **Auto-Title**: Geração automática de título executivo
2. **Botão "✨ Gerar Contexto"**: Combina tags + title em uma única chamada
3. **Tratamento de Legado**: Botão discreto em notas antigas para classificar retroativamente

---

### Parte 1: Banco de Dados

Adicionar coluna `title` na tabela `feedbacks`:

```sql
ALTER TABLE public.feedbacks 
ADD COLUMN title TEXT NULL;

COMMENT ON COLUMN public.feedbacks.title IS 'Título executivo gerado por IA ou inserido manualmente';
```

**Nota**: Coluna `tags` já existe (implementada anteriormente).

---

### Parte 2: Atualizar Edge Function (`classify-note`)

Modificar a função existente para retornar **tags + suggestedTitle**:

**Mudanças no System Prompt:**

```text
Você é um classificador de reuniões corporativas. Analise o texto e retorne:

1. TAGS: Escolha até 2 tags desta lista:
   - 1:1 (Conversas individuais, alinhamento semanal)
   - PDI (Carreira, promoções, desenvolvimento)
   - Feedback Difícil (Correção de rota, demissão)
   - Check-in (Status report, projetos)
   - Reunião Geral (3+ pessoas, townhalls)
   - Brainstorming (Ideação, problemas complexos)

2. TÍTULO: Gere um título executivo curto (máximo 6 palavras).

REGRAS DE TÍTULO:
- Ignore saudações ("Oi", "Bom dia")
- Foque na ação/tópico principal
- Exemplos: "Alinhamento de Contrato", "Feedback sobre Atraso"
- Se vago, use "Check-in Semanal" ou "Conversa de Alinhamento"
```

**Mudanças no Tool Calling:**

```typescript
tools: [{
  type: "function",
  function: {
    name: "classify_note",
    parameters: {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { 
            type: "string",
            enum: ["1:1", "PDI", "Feedback Difícil", "Check-in", "Reunião Geral", "Brainstorming"]
          },
          maxItems: 2
        },
        suggestedTitle: {
          type: "string",
          description: "Título executivo curto (max 6 palavras)"
        }
      },
      required: ["tags", "suggestedTitle"]
    }
  }
}]
```

**Novo Response:**

```json
{ "tags": ["1:1", "PDI"], "suggestedTitle": "Alinhamento de Carreira" }
```

---

### Parte 3: Interface de Criação (`NewNoteDialog.tsx`)

#### 3.1 Novo Estado para Título

```typescript
const [title, setTitle] = useState('');
```

#### 3.2 Renomear Botão para "✨ Gerar Contexto"

Posição: Na seção de Smart Tags, substituindo "Gerar Tags"

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleGenerateContext}
  disabled={!content.trim() || content.length < 20 || isClassifying || loading}
  className="gap-2 h-7 text-xs"
>
  {isClassifying ? (
    <Loader2 className="h-3 w-3 animate-spin" />
  ) : (
    <Sparkles className="h-3 w-3" />
  )}
  Gerar Contexto
</Button>
```

#### 3.3 Adicionar Campo de Título (Opcional)

Posição: Acima da seção de tags (ou abaixo da data)

```tsx
<div className="space-y-2">
  <Label>Título (opcional)</Label>
  <Input
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    placeholder="Será gerado automaticamente se deixar vazio"
    maxLength={60}
  />
  {title && (
    <p className="text-xs text-muted-foreground">
      {title.length}/60 caracteres
    </p>
  )}
</div>
```

#### 3.4 Atualizar handleGenerateContext

```typescript
const handleGenerateContext = async () => {
  if (!content.trim() || content.length < 20) {
    toast({
      title: "Conteúdo insuficiente",
      description: "Adicione mais texto para gerar o contexto.",
      variant: "destructive"
    });
    return;
  }

  setIsClassifying(true);

  try {
    const { data, error } = await supabase.functions.invoke('classify-note', {
      body: { content }
    });

    if (error) throw error;

    // Atualizar tags
    if (data?.tags && Array.isArray(data.tags)) {
      setTags(data.tags);
    }

    // Atualizar título (apenas se estiver vazio)
    if (data?.suggestedTitle && !title.trim()) {
      setTitle(data.suggestedTitle);
    }

    toast({
      title: "Contexto gerado! ✨",
      description: `${data.suggestedTitle} - ${data.tags?.join(", ")}`,
    });
  } catch (error: any) {
    // ... tratamento de erro existente
  } finally {
    setIsClassifying(false);
  }
};
```

#### 3.5 Atualizar handleSubmit

Incluir `title` no INSERT:

```typescript
const { data: feedback, error: insertError } = await supabase
  .from('feedbacks')
  .insert({
    // ... campos existentes
    tags: tags.length > 0 ? tags : [],
    title: title.trim() || null, // ← NOVO
  })
```

---

### Parte 4: Interface de Histórico (`FeedbackTimeline.tsx`)

#### 4.1 Atualizar Interface Feedback

```typescript
interface Feedback {
  id: string;
  created_at: string;
  occurred_at?: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
  tags?: string[];
  title?: string | null; // ← NOVO
}
```

#### 4.2 Exibir Título no Card

Se existir título, exibir como texto principal antes do conteúdo:

```tsx
{/* Título (se existir) */}
{feedback.title && (
  <h4 className="font-medium text-foreground mb-2">
    {feedback.title}
  </h4>
)}
```

#### 4.3 Adicionar Props para Análise de Legado

```typescript
interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
  onAnalyze?: (feedbackId: string, content: string) => void; // ← NOVO
  analyzingId?: string | null; // ← NOVO (para mostrar loading)
}
```

#### 4.4 Botão "✨ Analisar com IA" para Legado

Condição: Mostrar apenas se `tags` for array vazio ou null

```tsx
{/* Botão de Análise para Notas Legado */}
{(!feedback.tags || feedback.tags.length === 0) && onAnalyze && (
  <div className="mt-3 pt-3 border-t border-border/50">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onAnalyze(feedback.id, feedback.content)}
      disabled={analyzingId === feedback.id}
      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
    >
      {analyzingId === feedback.id ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      Analisar com IA
    </Button>
  </div>
)}
```

---

### Parte 5: Página de Detalhes (`MemberDetails.tsx`)

#### 5.1 Novo Estado para Análise

```typescript
const [analyzingFeedbackId, setAnalyzingFeedbackId] = useState<string | null>(null);
```

#### 5.2 Handler para Análise de Legado

```typescript
const handleAnalyzeLegacyFeedback = async (feedbackId: string, content: string) => {
  setAnalyzingFeedbackId(feedbackId);
  
  try {
    // 1. Chamar IA para classificar
    const { data, error } = await supabase.functions.invoke('classify-note', {
      body: { content }
    });

    if (error) throw error;

    // 2. Atualizar feedback no banco
    const { error: updateError } = await supabase
      .from('feedbacks')
      .update({
        tags: data.tags || [],
        title: data.suggestedTitle || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', feedbackId);

    if (updateError) throw updateError;

    // 3. Invalidar cache para refresh
    queryClient.invalidateQueries({ queryKey: ['feedbacks', id] });

    toast({
      title: "Nota classificada! ✨",
      description: `${data.suggestedTitle} - ${data.tags?.join(", ")}`,
    });
  } catch (error: any) {
    console.error('Error analyzing legacy feedback:', error);
    toast({
      title: "Erro na análise",
      description: error.message || "Tente novamente.",
      variant: "destructive"
    });
  } finally {
    setAnalyzingFeedbackId(null);
  }
};
```

#### 5.3 Passar Props para FeedbackTimeline

```tsx
<FeedbackTimeline 
  feedbacks={feedbacks} 
  onDelete={handleDeleteFeedback}
  onAnalyze={handleAnalyzeLegacyFeedback}
  analyzingId={analyzingFeedbackId}
/>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| **Migration SQL** | Adicionar coluna `title TEXT NULL` na tabela `feedbacks` |
| `supabase/functions/classify-note/index.ts` | Expandir para retornar `{ tags, suggestedTitle }` |
| `src/components/NewNoteDialog.tsx` | Adicionar campo título, renomear botão para "Gerar Contexto", incluir `title` no INSERT |
| `src/components/FeedbackTimeline.tsx` | Exibir título, adicionar botão "Analisar com IA" para notas sem tags |
| `src/pages/MemberDetails.tsx` | Implementar `handleAnalyzeLegacyFeedback` e passar props para Timeline |

---

### Seção Técnica

#### Fluxo: Nova Nota

```text
Usuário cola transcrição
        │
        ▼
Clica em "✨ Gerar Contexto"
        │
        ▼
classify-note Edge Function
        │
        ▼
Gemini analisa → { tags: ["1:1"], suggestedTitle: "Alinhamento de Metas" }
        │
        ▼
Frontend preenche: título + chips de tags
        │
        ▼
Usuário salva → tags[] e title vão para o banco
```

#### Fluxo: Nota Legado

```text
Card de nota antiga (sem tags)
        │
        ▼
Botão discreto: "✨ Analisar com IA"
        │
        ▼
classify-note Edge Function
        │
        ▼
UPDATE no Supabase: tags + title
        │
        ▼
queryClient.invalidateQueries() → Card atualizado em tempo real
```

#### Por que Título é Opcional?

1. **Retrocompatibilidade**: Notas antigas não têm título
2. **Liberdade do Usuário**: Pode digitar título manual ou deixar IA gerar
3. **Performance**: Se já existe título, não sobrescreve ao gerar contexto

#### Exibição do Título no Card

O título funciona como um "resumo de uma linha" que aparece em destaque:

```text
┌─────────────────────────────────────────────┐
│ 📅 15/01/2026  🎯 1:1  🚀 PDI          [🗑️] │
├─────────────────────────────────────────────┤
│ Alinhamento sobre Promoção                  │  ← Título em destaque
│                                             │
│ Conversamos sobre os próximos passos para   │  ← Conteúdo (line-clamp)
│ a promoção, incluindo certificações...      │
│                                             │
│ [Ver mais]                                  │
└─────────────────────────────────────────────┘
```

Para notas sem tags (legado):

```text
┌─────────────────────────────────────────────┐
│ 📅 10/12/2025                          [🗑️] │
├─────────────────────────────────────────────┤
│ Conversamos sobre os projetos atuais...     │
│                                             │
│ [Ver mais]                                  │
├─────────────────────────────────────────────┤
│ ✨ Analisar com IA                          │  ← Botão discreto
└─────────────────────────────────────────────┘
```

