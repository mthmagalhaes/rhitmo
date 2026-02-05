

## Plano: Remoção de Botões Manuais e Processamento em Batch

### Visao Geral

A classificacao por IA sera automatica e invisivel. Removeremos todos os botoes de acao manual dos cards de notas e criaremos um mecanismo de processamento em massa para atualizar o historico existente.

---

### Parte 1: Limpeza de Interface

#### 1.1 FeedbackTimeline.tsx - Remover Botao "Analisar com IA"

Remover completamente o bloco do botao de analise para notas legado (linhas 147-165):

```tsx
// REMOVER ESTE BLOCO INTEIRO:
{(!feedback.tags || feedback.tags.length === 0) && onAnalyze && (
  <div className="mt-3 pt-3 border-t border-border/50">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onAnalyze(feedback.id, feedback.content)}
      disabled={analyzingId === feedback.id}
      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
    >
      ...
    </Button>
  </div>
)}
```

Remover props nao utilizadas da interface:

```typescript
// ANTES:
interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
  onAnalyze?: (feedbackId: string, content: string) => void;
  analyzingId?: string | null;
}

// DEPOIS:
interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
}
```

Remover imports nao utilizados: `Loader2`, `Sparkles`

#### 1.2 MemberDetails.tsx - Remover Handler de Analise Legacy

Remover o estado `analyzingFeedbackId` (linha 46):

```typescript
// REMOVER:
const [analyzingFeedbackId, setAnalyzingFeedbackId] = useState<string | null>(null);
```

Remover a funcao `handleAnalyzeLegacyFeedback` (linhas 163-203).

Remover props do FeedbackTimeline:

```tsx
// ANTES:
<FeedbackTimeline 
  feedbacks={feedbacks} 
  onDelete={handleDeleteFeedback}
  onAnalyze={handleAnalyzeLegacyFeedback}
  analyzingId={analyzingFeedbackId}
/>

// DEPOIS:
<FeedbackTimeline 
  feedbacks={feedbacks} 
  onDelete={handleDeleteFeedback}
/>
```

#### 1.3 Exibicao para Notas Sem Titulo/Tags

Para notas ainda nao classificadas, exibir de forma limpa:
- Se nao tiver titulo: exibir apenas a data e o conteudo (sem placeholder "Processando...")
- Se nao tiver tags: nao exibir nenhum badge (o espaco fica vazio)

A visualizacao sera apenas leitura - sem botoes de acao.

---

### Parte 2: Novo Componente BatchSyncDialog

Criar `src/components/BatchSyncDialog.tsx`:

#### 2.1 Interface e Estados

```typescript
interface BatchSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Estados principais:
const [isProcessing, setIsProcessing] = useState(false);
const [progress, setProgress] = useState({ current: 0, total: 0 });
const [pendingCount, setPendingCount] = useState<number | null>(null);
const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'done' | 'error'>('idle');
```

#### 2.2 Logica de Contagem

```typescript
// Ao abrir o dialog, contar notas pendentes
const loadPendingCount = async () => {
  setStatus('loading');
  
  const { count, error } = await supabase
    .from('feedbacks')
    .select('*', { count: 'exact', head: true })
    .or('tags.is.null,tags.eq.{},title.is.null');
  
  if (error) {
    setStatus('error');
    return;
  }
  
  setPendingCount(count || 0);
  setStatus('idle');
};
```

#### 2.3 Logica de Processamento em Batch

```typescript
const handleSync = async () => {
  setIsProcessing(true);
  setStatus('processing');
  
  // 1. Buscar todas as notas pendentes (sem limite)
  const { data: pendingFeedbacks, error } = await supabase
    .from('feedbacks')
    .select('id, content')
    .or('tags.is.null,tags.eq.{},title.is.null')
    .order('created_at', { ascending: true });
  
  if (error || !pendingFeedbacks) {
    toast({ title: "Erro", description: error?.message, variant: "destructive" });
    setStatus('error');
    return;
  }
  
  setProgress({ current: 0, total: pendingFeedbacks.length });
  
  let successCount = 0;
  let errorCount = 0;
  
  // 2. Processar uma por uma (evitar rate limiting)
  for (let i = 0; i < pendingFeedbacks.length; i++) {
    const feedback = pendingFeedbacks[i];
    
    try {
      // Chamar Edge Function
      const { data, error: classifyError } = await supabase.functions.invoke('classify-note', {
        body: { content: feedback.content }
      });
      
      if (classifyError) throw classifyError;
      
      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('feedbacks')
        .update({
          tags: data.tags || [],
          title: data.suggestedTitle || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedback.id);
      
      if (updateError) throw updateError;
      
      successCount++;
    } catch (err) {
      console.error(`Error processing feedback ${feedback.id}:`, err);
      errorCount++;
    }
    
    setProgress({ current: i + 1, total: pendingFeedbacks.length });
    
    // Delay entre requests (300ms para evitar rate limiting)
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  setStatus('done');
  setIsProcessing(false);
  
  toast({
    title: "Sincronização concluída! ✨",
    description: `${successCount} notas classificadas. ${errorCount > 0 ? `${errorCount} erros.` : ''}`,
  });
};
```

#### 2.4 Interface Visual

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary" />
        Sincronizar Inteligência do Sistema
      </DialogTitle>
      <DialogDescription>
        Esta ação irá processar todas as notas antigas que ainda não possuem
        classificação por IA (tags e títulos).
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      {status === 'loading' && (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Verificando notas...</span>
        </div>
      )}
      
      {status === 'idle' && pendingCount !== null && (
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold text-primary">{pendingCount}</div>
          <p className="text-sm text-muted-foreground">
            {pendingCount === 0 
              ? "Todas as notas já estão classificadas! 🎉"
              : `nota${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''} de classificação`}
          </p>
        </div>
      )}
      
      {status === 'processing' && (
        <div className="space-y-3">
          <Progress value={(progress.current / progress.total) * 100} />
          <p className="text-sm text-center text-muted-foreground">
            Otimizando nota {progress.current} de {progress.total}...
          </p>
        </div>
      )}
      
      {status === 'done' && (
        <div className="text-center space-y-2">
          <div className="text-4xl">✨</div>
          <p className="text-sm text-muted-foreground">
            Sincronização concluída com sucesso!
          </p>
        </div>
      )}
    </div>
    
    <DialogFooter>
      {status === 'idle' && pendingCount !== null && pendingCount > 0 && (
        <Button onClick={handleSync} disabled={isProcessing} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Iniciar Sincronização
        </Button>
      )}
      
      {(status === 'done' || (status === 'idle' && pendingCount === 0)) && (
        <Button onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Parte 3: Integracao com ProfileSettingsDialog

Adicionar o botao de sincronizacao ao dialog de configuracoes do perfil:

#### 3.1 Novo Estado e Import

```typescript
import { BatchSyncDialog } from '@/components/BatchSyncDialog';

// Estado
const [batchSyncOpen, setBatchSyncOpen] = useState(false);
```

#### 3.2 Novo Botao no Dialog

Posicao: Abaixo do campo "Cargo", antes dos botoes de acao

```tsx
<div className="space-y-4">
  {/* Campos existentes: Nome, Cargo */}
  
  {/* Divisor */}
  <div className="border-t pt-4">
    <Label className="text-muted-foreground text-xs uppercase tracking-wide mb-2 block">
      Manutenção
    </Label>
    <Button
      type="button"
      variant="outline"
      onClick={() => setBatchSyncOpen(true)}
      className="w-full justify-start gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      Sincronizar Inteligência do Sistema
    </Button>
    <p className="text-xs text-muted-foreground mt-1">
      Processa notas antigas sem classificação por IA
    </p>
  </div>
</div>

<BatchSyncDialog 
  open={batchSyncOpen} 
  onOpenChange={setBatchSyncOpen} 
/>
```

---

### Resumo das Alteracoes

| Arquivo | Alteração |
|---------|-----------|
| `src/components/FeedbackTimeline.tsx` | Remover botão "Analisar com IA", remover props `onAnalyze`/`analyzingId`, limpar imports |
| `src/pages/MemberDetails.tsx` | Remover estado `analyzingFeedbackId`, remover handler `handleAnalyzeLegacyFeedback`, atualizar props do FeedbackTimeline |
| `src/components/BatchSyncDialog.tsx` | **NOVO** - Dialog com barra de progresso para processamento em massa |
| `src/components/ProfileSettingsDialog.tsx` | Adicionar botão "Sincronizar Inteligência do Sistema" |

---

### Secao Tecnica

#### Fluxo do Batch Processor

```text
Usuario clica em "⚙️ Configurações" na Sidebar
        │
        ▼
Abre ProfileSettingsDialog → clica em "🔄 Sincronizar Inteligência"
        │
        ▼
Abre BatchSyncDialog → conta notas pendentes (136)
        │
        ▼
Clica em "Iniciar Sincronização"
        │
        ▼
Loop sequencial (evita rate limiting):
┌────────────────────────────────────────┐
│ Para cada nota pendente:               │
│   1. Chamar classify-note              │
│   2. UPDATE feedbacks SET tags, title  │
│   3. Atualizar barra de progresso      │
│   4. Delay 300ms                       │
└────────────────────────────────────────┘
        │
        ▼
Exibe "Sincronização concluída! ✨"
        │
        ▼
Usuario fecha e ve todas as notas classificadas
```

#### Por que Processamento Sequencial?

1. **Rate Limiting**: A API de IA tem limites por minuto
2. **Visibilidade**: Barra de progresso mostra exatamente o que esta acontecendo
3. **Resiliencia**: Se uma nota falhar, as outras continuam
4. **Timeout**: Evita timeout do navegador (cada request e rapido)

#### Estimativa de Tempo

Com 136 notas e 300ms de delay + ~1s de processamento por nota:
- **Tempo estimado**: ~3-4 minutos
- **Custo**: Minimal (usando gemini-2.5-flash)

#### Alternativa Futura: Background Job

Para escalabilidade futura, poderiamos criar uma Edge Function `process-legacy-notes` que roda em background. Mas para o caso atual (136 notas), o processamento client-side e suficiente e oferece melhor UX com a barra de progresso.

