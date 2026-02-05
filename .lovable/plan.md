

## Plano: Padronização Visual Forçada (Global UI Fix)

### Problema Identificado

O componente `FeedbackTimeline.tsx` atual:
1. **NÃO usa layout Accordion** - renderiza cards abertos com conteúdo sempre visível
2. **Sem título de fallback** - notas sem `title` simplesmente não mostram nada no cabeçalho
3. **Exibe HTML cru** - o `feedback.content` é renderizado como texto puro, mostrando tags como `<p>` visíveis
4. **Layout inconsistente** - notas com/sem tags têm visualizações diferentes

### Solução: Reescrever para Layout Accordion Compacto

---

### Parte 1: Reestruturar para Accordion

#### 1.1 Novos Imports

```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import DOMPurify from 'dompurify';
import { cleanTranscriptText, containsHtml } from '@/lib/textSanitizer';
```

#### 1.2 Nova Estrutura do Card

Cada nota será um Collapsible que começa fechado:

```tsx
<Collapsible key={feedback.id}>
  {/* Linha Compacta (sempre visível) */}
  <CollapsibleTrigger className="w-full">
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg border">
      {/* Esquerda: Data + Título + Tags */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">
          📅 {formatDate(feedback.occurred_at || feedback.created_at)}
        </span>
        
        {/* Título com Fallback */}
        <span className={cn(
          "font-medium",
          feedback.title ? "text-foreground" : "text-muted-foreground italic"
        )}>
          {feedback.title || "📝 Anotação não classificada"}
        </span>
        
        {/* Tags (se existirem) */}
        {feedback.tags?.length > 0 && (
          <div className="flex gap-1">
            {feedback.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {getTagEmoji(tag)} {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Direita: Chevron + Delete */}
      <div className="flex items-center gap-2">
        <ChevronDown className="h-4 w-4 transition-transform [data-state=open]&:rotate-180" />
        {onDelete && <DeleteButton ... />}
      </div>
    </div>
  </CollapsibleTrigger>
  
  {/* Conteúdo Expandido (oculto por padrão) */}
  <CollapsibleContent>
    <div className="p-4 pt-0 border-x border-b rounded-b-lg">
      <div className="prose prose-sm max-w-none text-foreground">
        {renderSanitizedContent(feedback.content)}
      </div>
    </div>
  </CollapsibleContent>
</Collapsible>
```

---

### Parte 2: Renderização Sanitizada do Conteúdo

#### 2.1 Função de Renderização

```tsx
const renderSanitizedContent = (content: string) => {
  if (!content) return null;
  
  // Verificar se contém HTML
  if (containsHtml(content)) {
    // Sanitizar HTML e renderizar com estilos prose
    return (
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(content, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
            ALLOWED_ATTR: []
          }) 
        }} 
      />
    );
  }
  
  // Texto puro: limpar e usar whitespace-pre-wrap
  const cleanedText = cleanTranscriptText(content);
  return (
    <p className="whitespace-pre-wrap text-foreground leading-relaxed">
      {cleanedText}
    </p>
  );
};
```

---

### Parte 3: Estados Visuais

#### Estado Fechado (Padrão)

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📅 15/01/2026  Alinhamento sobre Promoção  🎯 1:1  🚀 PDI  [▼] │
└─────────────────────────────────────────────────────────────────┘
```

#### Estado Fechado (Sem Classificação)

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📅 10/12/2025  📝 Anotação não classificada                [▼] │
└─────────────────────────────────────────────────────────────────┘
```

(O texto "Anotação não classificada" aparece em cinza e itálico)

#### Estado Aberto

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📅 15/01/2026  Alinhamento sobre Promoção  🎯 1:1  🚀 PDI  [▲] │
├─────────────────────────────────────────────────────────────────┤
│ Conversamos sobre os próximos passos para a promoção,          │
│ incluindo certificações necessárias e prazos.                   │
│                                                                 │
│ O Gui demonstrou interesse em liderar o novo projeto.          │
└─────────────────────────────────────────────────────────────────┘
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/FeedbackTimeline.tsx` | Reescrever completamente para usar Collapsible, adicionar título de fallback, sanitizar conteúdo HTML |

---

### Seção Técnica

#### Dependências Utilizadas

- `@radix-ui/react-collapsible` (já instalado)
- `dompurify` (já instalado)
- `cleanTranscriptText` de `@/lib/textSanitizer` (já existe)

#### Lógica de Fallback de Título

```typescript
// Prioridade:
// 1. feedback.title (se existir)
// 2. Placeholder "📝 Anotação não classificada" (cinza/itálico)

const displayTitle = feedback.title || "📝 Anotação não classificada";
const isFallback = !feedback.title;
```

#### Lógica de Sanitização de Conteúdo

```typescript
// Pipeline de decisão:
// 1. Verificar se contém HTML (containsHtml)
// 2. Se sim: DOMPurify.sanitize() + dangerouslySetInnerHTML
// 3. Se não: cleanTranscriptText() + whitespace-pre-wrap
```

#### Por que Collapsible em vez de Accordion?

- **Accordion**: Apenas um item aberto por vez
- **Collapsible**: Múltiplos itens podem estar abertos simultaneamente

Para uma timeline, Collapsible é mais apropriado pois o usuário pode querer comparar duas notas lado a lado.

#### Botão de Delete

O botão de delete será movido para fora do CollapsibleTrigger para evitar conflito de cliques:

```tsx
<div className="flex items-center gap-2">
  <CollapsibleTrigger>
    <ChevronDown />
  </CollapsibleTrigger>
  <DeleteButton onClick={stopPropagation} />
</div>
```

