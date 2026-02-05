

## Plano: Classificação Automática no Save (Zero Click)

### Visão Geral

Remover o botão manual "✨ Gerar Contexto" e integrar a classificação por IA diretamente no fluxo de salvamento. O usuário cola a transcrição, clica em "Salvar" e a nota já nasce com título e tags.

---

### Parte 1: Remover Elementos Manuais

#### 1.1 Remover Botão "Gerar Contexto"

Deletar o botão que está nas linhas 483-497:

```tsx
// REMOVER ESTE BLOCO INTEIRO:
<Button
  type="button"
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

#### 1.2 Simplificar Label de Título

Manter apenas o label sem o botão ao lado:

```tsx
// ANTES:
<div className="flex items-center justify-between">
  <Label htmlFor="title">Título (opcional)</Label>
  <Button>...</Button>
</div>

// DEPOIS:
<Label htmlFor="title">Título (opcional)</Label>
```

#### 1.3 Atualizar Texto de Tags

Substituir a mensagem que instrui clicar no botão:

```tsx
// ANTES:
<p className="text-xs text-muted-foreground">
  Clique em "Gerar Contexto" para classificar automaticamente esta nota
</p>

// DEPOIS:
<p className="text-xs text-muted-foreground">
  Tags serão geradas automaticamente ao salvar
</p>
```

#### 1.4 Remover Função `handleGenerateContext`

Deletar a função completa (linhas 131-176) pois não será mais usada.

#### 1.5 Remover Import `Sparkles`

Atualizar o import para remover o ícone não utilizado:

```tsx
// ANTES:
import { PenSquare, Loader2, Upload, CalendarIcon, Sparkles, X } from 'lucide-react';

// DEPOIS:
import { PenSquare, Loader2, Upload, CalendarIcon, X } from 'lucide-react';
```

---

### Parte 2: Integrar Classificação no `handleSubmit`

#### 2.1 Nova Lógica do Submit

Interceptar o salvamento para classificar antes de gravar:

```typescript
const handleSubmit = async () => {
  // Validações existentes...
  if (!content.trim()) { ... }
  if (!targetMemberId) { ... }
  if (!occurredAt) { ... }

  setLoading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Você precisa estar logado');

    const cleanedContent = cleanTranscriptText(content);
    
    // =====================================
    // NOVO: Classificação Automática
    // =====================================
    let finalTags = tags;
    let finalTitle = title.trim();
    
    // Só classifica se: conteúdo > 20 chars E (tags vazias OU título vazio)
    const shouldClassify = cleanedContent.length > 20 && 
                          (tags.length === 0 || !finalTitle);
    
    if (shouldClassify) {
      try {
        console.log('[NewNoteDialog] Auto-classifying content...');
        
        const { data: classifyData, error: classifyError } = await supabase
          .functions.invoke('classify-note', {
            body: { content: cleanedContent }
          });
        
        if (classifyError) {
          console.warn('[NewNoteDialog] Classification failed, proceeding without:', classifyError);
          // Não bloqueia o salvamento - apenas loga o erro
        } else {
          // Aplicar tags se ainda não tiver
          if (tags.length === 0 && classifyData?.tags?.length > 0) {
            finalTags = classifyData.tags;
          }
          
          // Aplicar título se ainda não tiver
          if (!finalTitle && classifyData?.suggestedTitle) {
            finalTitle = classifyData.suggestedTitle;
          }
          
          console.log('[NewNoteDialog] Classification result:', { 
            tags: finalTags, 
            title: finalTitle 
          });
        }
      } catch (classifyErr) {
        console.warn('[NewNoteDialog] Classification error (non-blocking):', classifyErr);
        // Continua sem classificação - salvamento não deve falhar por isso
      }
    }
    // =====================================
    
    // INSERT com dados enriquecidos
    const { data: feedback, error: insertError } = await supabase
      .from('feedbacks')
      .insert({
        manager_id: user.id,
        member_id: targetMemberId,
        content: cleanedContent,
        type: 'neutral',
        occurred_at: occurredAt.toISOString(),
        tags: finalTags.length > 0 ? finalTags : [],
        title: finalTitle || null,
        summary: null,
        sentiment: null,
        coaching_tips: null,
        bias_alert: null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Toast de sucesso (melhorado para mostrar classificação)
    const hasClassification = finalTags.length > 0 || finalTitle;
    toast({
      title: hasClassification ? "Anotação salva e classificada! ✨" : "Anotação salva! ✅",
      description: hasClassification 
        ? `${finalTitle || ''} ${finalTags.length ? `• ${finalTags.join(", ")}` : ''}`.trim()
        : "Registro adicionado ao histórico.",
    });

    // ... resto do fluxo (reset, close, backup)
  } catch (error: any) {
    // ... tratamento de erro existente
  } finally {
    setLoading(false);
  }
};
```

---

### Parte 3: Manter Funcionalidades Existentes

#### 3.1 Campo de Título Manual

O usuário ainda pode digitar um título manualmente. Se ele preencher, a IA não sobrescreve:

```typescript
// Se usuário já digitou título, usar o dele
if (!finalTitle && classifyData?.suggestedTitle) {
  finalTitle = classifyData.suggestedTitle;
}
```

#### 3.2 Tags Manuais (Futuro)

Se no futuro adicionarmos seleção manual de tags, a mesma lógica se aplica:

```typescript
// Se usuário já selecionou tags, não sobrescrever
if (tags.length === 0 && classifyData?.tags?.length > 0) {
  finalTags = classifyData.tags;
}
```

#### 3.3 Exibição de Tags no Dialog

Manter a seção de tags para visualização (caso o usuário tenha selecionado manualmente):

```tsx
{/* Smart Tags Section - apenas visualização */}
<div className="space-y-2">
  <Label>Tags de Classificação</Label>
  {tags.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className={cn("...", getTagColor(tag))}>
          {getTagEmoji(tag)} {tag}
          <button onClick={() => removeTag(tag)}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  ) : (
    <p className="text-xs text-muted-foreground">
      Tags serão geradas automaticamente ao salvar
    </p>
  )}
</div>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/NewNoteDialog.tsx` | Remover botão "Gerar Contexto", integrar classificação no `handleSubmit`, atualizar textos e imports |

---

### Seção Técnica

#### Fluxo: Zero Click Classification

```text
Usuário cola transcrição
        │
        ▼
Preenche data (se não detectada)
        │
        ▼
Clica em "Salvar"
        │
        ▼
handleSubmit() inicia (loading = true)
        │
        ▼
┌───────────────────────────────────────┐
│ Verificação:                          │
│ conteúdo > 20 chars                   │
│ E (tags vazias OU título vazio)?      │
└───────────────────────────────────────┘
        │
        ├── NÃO → Pular classificação
        │
        └── SIM ↓
                │
                ▼
      classify-note Edge Function
      (~1-2 segundos)
                │
                ▼
      Merge: finalTags + finalTitle
                │
                ▼
      INSERT no Supabase com dados enriquecidos
                │
                ▼
      Toast: "Anotação salva e classificada! ✨"
                │
                ▼
      Modal fecha, lista atualiza
```

#### Resiliência: Fail-Safe

A classificação é non-blocking:

```typescript
try {
  const { data, error } = await supabase.functions.invoke('classify-note', ...);
  // Usar resultado se sucesso
} catch (err) {
  console.warn('Classification failed, proceeding without:', err);
  // Continuar salvando sem classificação
}
```

Se a IA falhar por qualquer motivo (timeout, rate limit, etc.), a nota é salva normalmente sem tags/título automáticos. O usuário pode usar o Batch Sync depois para classificar.

#### Experiência do Usuário

| Cenário | Tempo Estimado | Resultado |
|---------|----------------|-----------|
| Nota curta (< 20 chars) | ~50ms | Salva sem classificação |
| Nota normal + IA sucesso | ~2s | Salva com tags e título |
| Nota normal + IA timeout | ~30s → fallback | Salva sem classificação |
| Nota com título manual | ~2s | Salva com tags IA + título manual |

#### Estados do Botão "Salvar"

O botão já mostra loading durante todo o processo:

```tsx
<Button onClick={handleSubmit} disabled={loading || isProcessingFile || !occurredAt}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Salvar
</Button>
```

O usuário verá o spinner por ~2 segundos enquanto a classificação acontece em background.

