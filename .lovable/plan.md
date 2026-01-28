
## Análise: Refinamento UX - Status Atual

### Conclusão Principal

**A feature "Ver Mais" já está implementada!** O `FeedbackTimeline.tsx` já possui toda a lógica necessária com `line-clamp-4` e botões de expansão. A única melhoria necessária é na experiência de timeout.

---

### Status das Features

| Feature | Status | Localização |
|---------|--------|-------------|
| Toggle "Ver Mais" (Timeline) | IMPLEMENTADO | `FeedbackTimeline.tsx` linhas 49-53, 165-191, 237-262 |
| Timeout + Polling 30s | IMPLEMENTADO | `MemberDetails.tsx` linhas 96-119 |
| Flag `_analysisStuck` | IMPLEMENTADO | `MemberDetails.tsx` linhas 110-119 |
| Mensagem amigável de timeout | PENDENTE | `FeedbackTimeline.tsx` |
| Timeout em geração de reviews | PENDENTE | `NewReviewDialog.tsx` |

---

### Implementação Necessária

#### 1. Mensagem Amigável para Análises Lentas

**Arquivo**: `src/components/FeedbackTimeline.tsx`

**Modificação**: Quando `feedback._analysisStuck === true`, exibir mensagem informativa em vez de só parar o spinner:

```text
┌─────────────────────────────────────────────────┐
│ [Badge: Neutro]                    📅 28/01/26  │
│                                                 │
│ ⏳ A análise está demorando mais que o normal.  │
│    Estamos processando em segundo plano.        │
│    Atualize a página em alguns minutos.         │
│                                                 │
│ [Conteúdo original da nota...]                  │
│                                                 │
│ [Botão: Gerar Análise de IA]                    │
└─────────────────────────────────────────────────┘
```

---

#### 2. Timeout Inteligente na Geração de Avaliações

**Arquivo**: `src/components/NewReviewDialog.tsx`

**Problema**: A função `generateReview()` (linha 38-85) não tem timeout - se a Edge Function demorar 60+ segundos, o usuário fica preso.

**Solução**: Implementar `Promise.race()` com timeout de 30 segundos:

```typescript
const generateReview = async (months: number) => {
  setGenerating(true);
  setGeneratedMonths(months);
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), 30000)
  );
  
  const fetchPromise = supabase.functions.invoke('generate-review', {
    body: { memberId, months }
  });
  
  try {
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    
    // ... lógica existente de sucesso ...
    
  } catch (error: any) {
    if (error.message === 'TIMEOUT') {
      toast({
        title: "Processamento em andamento ⏳",
        description: "A análise está demorando. Continue editando ou tente novamente.",
      });
      // Não mostrar erro destrutivo, apenas informativo
    } else {
      toast({
        title: "Erro ao gerar avaliação",
        description: error.message,
        variant: "destructive",
      });
    }
  } finally {
    setGenerating(false);
  }
};
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/FeedbackTimeline.tsx` | Adicionar bloco visual para notas com `_analysisStuck === true` |
| `src/components/NewReviewDialog.tsx` | Implementar timeout de 30s com `Promise.race()` na geração de avaliações |

---

### Seção Técnica

**Lógica de `_analysisStuck` (já existente em MemberDetails.tsx)**:
```typescript
// Linhas 110-119: Marca notas sem análise após 30 segundos
const feedbacks = feedbacksRaw.map((f: any) => {
  if (f.summary || f.sentiment) return f;
  const createdAt = new Date(f.created_at);
  const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;
  return {
    ...f,
    _analysisStuck: diffSeconds > 30
  };
});
```

**Nova interface para FeedbackTimeline**:
```typescript
interface Feedback {
  // ... campos existentes ...
  _analysisStuck?: boolean; // Já existe, linha 31
}
```

**Componente de alerta (novo)**:
```typescript
{isProcessing && feedback._analysisStuck && (
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded mb-4">
    <p className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200">
      <Clock className="h-4 w-4" />
      Análise em processamento
    </p>
    <p className="text-sm text-amber-700 dark:text-amber-300">
      A IA está demorando mais que o normal. Você pode atualizar a página em alguns minutos.
    </p>
  </div>
)}
```

**Benefícios**:
- Usuário não fica "preso" esperando
- Mensagens claras sobre o que está acontecendo
- Experiência responsiva mesmo com IA lenta
- Evita sensação de app travado
