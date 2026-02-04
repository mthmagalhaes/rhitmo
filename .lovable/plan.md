

## Plano: Registro Historico Limpo e Assincrono

### Objetivo

Transformar a timeline de feedbacks em um **registro historico estatico e instantaneo**, removendo toda poluicao visual relacionada a IA. A inteligencia sera acionada apenas sob demanda no Mentor Chat, que le os dados brutos do banco.

---

### Estado Atual

| Componente | Problema Identificado |
|------------|----------------------|
| `FeedbackTimeline.tsx` | Exibe badges de sentimento, dicas de coaching, botao "Gerar Analise de IA", banners de processamento |
| `NewNoteDialog.tsx` | Footer some com scroll longo, botao diz "Analisar e Salvar" |
| Banco de dados | Dados de IA (summary, sentiment, coaching_tips) continuam salvos - **NAO serao deletados** |

---

### Parte 1: Limpeza do Feed (FeedbackTimeline.tsx)

**Elementos a REMOVER da renderizacao:**

| Elemento | Linhas | Acao |
|----------|--------|------|
| Badge de Tipo (Positivo/Neutro) | 109-111 | Remover |
| Badge de Sentimento | 112-114 | Remover |
| Loading "Analisando..." | 115-120 | Remover |
| Loading "Em processamento..." | 121-126 | Remover |
| Banner amarelo "Analise em processamento" | 167-178 | Remover |
| Secao "Resumo" com summary | 182-212 | Remover |
| Secao "Dicas para lideranca" | 214-227 | Remover |
| Secao "Alerta de Vies" | 229-237 | Remover |
| Collapsible "Ver Transcricao Original" | 239-253 | Remover (conteudo ja sera exibido diretamente) |
| Botao "Gerar Analise de IA" | 284-303 | Remover |

**Elementos a MANTER:**

| Elemento | Descricao |
|----------|-----------|
| Data | Exibir `occurred_at` ou `created_at` com icone Calendar |
| Botao Delete | Manter funcionalidade de exclusao |
| Conteudo (content) | Exibir texto original com `line-clamp-4` |
| Toggle "Ver mais/menos" | Expandir conteudo longo |

**Codigo que pode ser REMOVIDO (nao sera mais usado):**

- Props `onReanalyze` e `reanalyzingId`
- Funcoes `getTypeVariant`, `getTypeLabel`, `getSentimentLabel`
- Funcao `hasAnalysis`, `isProcessingAnalysis`
- Estado `openTranscripts`
- Campos da interface: `summary`, `sentiment`, `coaching_tips`, `bias_alert`, `_analysisStuck`

**Layout Final do Card:**

```
+----------------------------------------------------------+
|  [Data: 15 de janeiro de 2026]                    [Lixeira]|
|----------------------------------------------------------|
|  Lorem ipsum dolor sit amet, consectetur adipiscing...    |
|  [Ver mais]                                               |
+----------------------------------------------------------+
```

---

### Parte 2: Layout do Modal (NewNoteDialog.tsx)

**Problema Atual:**
- Em telas pequenas ou textos longos, o footer some e o usuario precisa rolar a pagina inteira
- Botao menciona "Analisar" gerando expectativa de processamento

**Solucao - Sticky Footer:**

Refatorar `DialogContent` para usar flex layout com altura controlada:

```
DialogContent
├── flex flex-col max-h-[85vh]
│
├── DialogHeader (fixo no topo)
│
├── div.flex-1.overflow-y-auto (area scrollavel)
│   ├── Select Liderado
│   ├── DatePicker Data registrada
│   ├── Upload Area
│   └── RichTextEditor
│
└── DialogFooter (sticky no rodape, sempre visivel)
    ├── [Cancelar]
    └── [Salvar]  ← RENOMEAR de "Analisar e Salvar"
```

**Alteracoes no handleSubmit:**

- Alterar toast de sucesso de "Processando analise inteligente..." para mensagem mais simples
- Remover chamada ao `analyze-feedback-background` (nao sera mais necessario)
- Manter backup no Storage como safety net

---

### Parte 3: Atualizacao do MemberDetails.tsx

Remover props nao utilizados ao chamar `FeedbackTimeline`:

```typescript
// Antes
<FeedbackTimeline 
  feedbacks={feedbacks} 
  onDelete={handleDeleteFeedback} 
  onReanalyze={handleReanalyze}  // REMOVER
  reanalyzingId={reanalyzingId}  // REMOVER
/>

// Depois
<FeedbackTimeline 
  feedbacks={feedbacks} 
  onDelete={handleDeleteFeedback}
/>
```

Remover funcao `handleReanalyze` e estado `reanalyzingId` do componente.

---

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `FeedbackTimeline.tsx` | Remover TODA renderizacao de IA, simplificar para Data + Conteudo + Delete |
| `NewNoteDialog.tsx` | Sticky footer, renomear botao para "Salvar", simplificar toast |
| `MemberDetails.tsx` | Remover props e handlers de reanalise |

---

### Impacto no Banco de Dados

**ZERO** - Os dados existentes (`summary`, `sentiment`, `coaching_tips`, `bias_alert`, `embedding`) permanecem no banco. Apenas a **visualizacao** e removida. O Mentor Chat continuara tendo acesso aos dados brutos para analise sob demanda.

---

### Secao Tecnica

**FeedbackTimeline.tsx - Componente Simplificado:**

```typescript
interface Feedback {
  id: string;
  created_at: string;
  occurred_at?: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
}

interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
}

export const FeedbackTimeline = ({ feedbacks, onDelete }: FeedbackTimelineProps) => {
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedContent(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const shouldShowExpandButton = (text: string | undefined) => {
    if (!text) return false;
    return text.length > 280;
  };

  return (
    <div className="space-y-6">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id} className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            {/* Header: Data + Delete */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {onDelete && (
                <AlertDialog>
                  {/* ... delete confirmation ... */}
                </AlertDialog>
              )}
            </div>
            
            {/* Content with expand toggle */}
            <p className={cn(
              "text-foreground leading-relaxed",
              !expandedContent[feedback.id] && shouldShowExpandButton(feedback.content) && "line-clamp-4"
            )}>
              {feedback.content}
            </p>
            {shouldShowExpandButton(feedback.content) && (
              <Button variant="ghost" size="sm" onClick={() => toggleExpand(feedback.id)}>
                {expandedContent[feedback.id] ? 'Ver menos' : 'Ver mais'}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

**NewNoteDialog.tsx - Layout Sticky:**

```typescript
<DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh] p-0">
  <DialogHeader className="px-6 pt-6 pb-4">
    {/* ... header ... */}
  </DialogHeader>
  
  {/* Scrollable content area */}
  <div className="flex-1 overflow-y-auto px-6 space-y-4">
    {/* Select, DatePicker, Upload, Editor */}
  </div>
  
  {/* Sticky footer - always visible */}
  <DialogFooter className="px-6 py-4 border-t bg-background">
    <Button variant="outline">Cancelar</Button>
    <Button>Salvar</Button>  {/* Renomeado */}
  </DialogFooter>
</DialogContent>
```

**handleSubmit simplificado:**

```typescript
toast({
  title: "Anotacao salva!",
  description: "Registro adicionado ao historico.",
});

// REMOVER chamada analyze-feedback-background
// MANTER backup-data como safety net
```

