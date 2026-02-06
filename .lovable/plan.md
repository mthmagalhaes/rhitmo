

## Plano: Mentor Chat com Inteligencia Hibrida (Modo Auto vs. Manual)

### Visao Geral

O Mentor Chat tera dois modos de operacao:
1. **Modo Automatico (Padrao)**: A IA analisa automaticamente as ultimas 10 notas do membro
2. **Modo Manual (Focado)**: O usuario seleciona notas especificas para analise

A interface sera inspirada no Tactiq/MeetRox com um ContextPicker elegante e Quick Action Chips.

---

### Arquitetura Atual

| Componente | Localizacao | Funcao |
|------------|-------------|--------|
| MentorChat.tsx | Frontend | Dialog com threads e mensagens |
| chat-mentor Edge Function | Backend | Processa perguntas com contexto |
| MemberDetails.tsx | Frontend | Passa `feedbacks` para MentorChat |

**Fluxo Atual**:
```text
MemberDetails → passa todos os feedbacks → MentorChat → envia para Edge Function → Router decide se usa contexto
```

**Novo Fluxo**:
```text
MemberDetails → passa todos os feedbacks → MentorChat 
                                            ├── Modo Auto: envia 10 ultimas
                                            └── Modo Manual: envia apenas selecionados
                                                      ↓
                                            Edge Function com instrucoes especificas
```

---

### Parte 1: Novo Componente ContextPicker.tsx

#### 1.1 Interface e Props

```typescript
// src/components/ContextPicker.tsx

interface ContextPickerProps {
  feedbacks: Feedback[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  memberId: string;
}
```

#### 1.2 UI do Popover

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="sm" className="gap-2">
      <BookOpen className="h-4 w-4" />
      Contexto
      {selectedIds.length > 0 && (
        <Badge variant="secondary" className="ml-1">
          {selectedIds.length}
        </Badge>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0" align="start">
    <div className="p-3 border-b">
      <h4 className="font-medium">Selecionar Notas</h4>
      <p className="text-xs text-muted-foreground">
        Escolha notas especificas ou deixe vazio para modo automatico
      </p>
    </div>
    <ScrollArea className="h-[300px]">
      <div className="p-2 space-y-1">
        {feedbacks.slice(0, 15).map(fb => (
          <label key={fb.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer">
            <Checkbox 
              checked={selectedIds.includes(fb.id)}
              onCheckedChange={(checked) => {
                if (checked) onSelectionChange([...selectedIds, fb.id]);
                else onSelectionChange(selectedIds.filter(id => id !== fb.id));
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(fb.occurred_at || fb.created_at), 'dd/MM', { locale: ptBR })}
                </span>
                <span className="text-sm truncate">
                  {fb.title || 'Anotacao nao classificada'}
                </span>
              </div>
              {fb.tags?.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {fb.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                      {getTagEmoji(tag)} {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </ScrollArea>
    <div className="p-3 border-t flex justify-between">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => onSelectionChange([])}
        disabled={selectedIds.length === 0}
      >
        Limpar
      </Button>
      <Button size="sm" onClick={() => setOpen(false)}>
        Aplicar
      </Button>
    </div>
  </PopoverContent>
</Popover>
```

---

### Parte 2: Modificacoes no MentorChat.tsx

#### 2.1 Novos Estados

```typescript
// Adicionar ao componente MentorChat
const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
```

#### 2.2 Area de Status do Contexto (Header do Chat)

Adicionar abaixo do DialogTitle:

```tsx
{/* Context Status Area */}
<div className="px-6 py-2 bg-muted/30 border-b">
  {selectedContexts.length > 0 ? (
    // Modo Manual: Chips removiveis
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Contexto:</span>
      {selectedContexts.map(id => {
        const fb = feedbacks.find(f => f.id === id);
        return (
          <Badge 
            key={id} 
            variant="outline" 
            className="gap-1.5 pl-2 pr-1"
          >
            <span className="text-xs truncate max-w-[120px]">
              {fb?.title || 'Nota'}
            </span>
            <button 
              onClick={() => setSelectedContexts(prev => prev.filter(x => x !== id))}
              className="hover:bg-accent rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  ) : (
    // Modo Automatico: Badge informativo
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200">
        <Sparkles className="h-3 w-3 mr-1.5" />
        Modo Automatico: Analisando historico recente
      </Badge>
    </div>
  )}
</div>
```

#### 2.3 Botao de Contexto no Header

Adicionar o ContextPicker no header do chat (ao lado do titulo):

```tsx
<DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
  <div className="flex items-center justify-between">
    <DialogTitle className="text-foreground text-lg">
      🎯 Mentor Chat
      <span className="text-muted-foreground font-normal text-base ml-2">
        - {memberName} {memberRole && `(${memberRole})`}
      </span>
    </DialogTitle>
    
    <ContextPicker 
      feedbacks={feedbacks}
      selectedIds={selectedContexts}
      onSelectionChange={setSelectedContexts}
      memberId={memberId}
    />
  </div>
</DialogHeader>
```

#### 2.4 Novos Quick Chips

Substituir os quickSuggestions atuais:

```typescript
const quickSuggestions = [
  { emoji: '📝', text: 'Resumir estas notas' },
  { emoji: '✅', text: 'Extrair Acoes' },
  { emoji: '💡', text: 'Gerar insights' },
];
```

#### 2.5 Modificar handleSend para Modo Hibrido

```typescript
const handleSend = async (messageToSend?: string) => {
  // ... validacoes existentes ...

  try {
    // ... criar thread se necessario ...

    // Preparar contexto baseado no modo
    let contextFeedbacks: any[];
    let contextMode: 'auto' | 'manual';
    
    if (selectedContexts.length > 0) {
      // Modo Manual: usar apenas notas selecionadas
      contextMode = 'manual';
      contextFeedbacks = feedbacks.filter(fb => selectedContexts.includes(fb.id));
    } else {
      // Modo Automatico: usar 10 mais recentes
      contextMode = 'auto';
      const sorted = [...feedbacks].sort((a, b) => 
        new Date(b.occurred_at || b.created_at).getTime() - 
        new Date(a.occurred_at || a.created_at).getTime()
      );
      contextFeedbacks = sorted.slice(0, 10);
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-mentor`,
      {
        method: 'POST',
        headers: { ... },
        body: JSON.stringify({
          question: finalMessage,
          feedbacks: contextFeedbacks,
          memberName,
          memberRole,
          managerName,
          workStyleData,
          keyObjectives,
          contextMode // NOVO: indicar modo ao backend
        }),
        signal: controller.signal
      }
    );
    // ... resto do fluxo ...
  }
};
```

---

### Parte 3: Modificacoes na Edge Function chat-mentor

#### 3.1 Receber contextMode

```typescript
serve(async (req) => {
  // ...
  const { 
    question, 
    feedbacks, 
    memberName, 
    memberRole, 
    managerName, 
    workStyleData, 
    keyObjectives,
    contextMode // NOVO PARAMETRO
  } = await req.json();
```

#### 3.2 Instrucoes Diferenciadas no System Prompt

Adicionar secao condicional baseada no modo:

```typescript
// Construir instrucao de contexto baseada no modo
let contextInstruction = '';

if (contextMode === 'manual') {
  contextInstruction = `
## MODO DE ANALISE: FOCO SELETIVO

O usuario SELECIONOU MANUALMENTE as notas abaixo. Isso significa que ele quer uma analise FOCADA e PROFUNDA apenas neste contexto especifico.

**REGRAS PARA MODO MANUAL:**
- Ignore qualquer historico que nao esteja listado abaixo
- Responda a pergunta baseando-se ESTRITAMENTE nestes textos
- Se a pergunta pedir "resumir estas notas", resuma APENAS as notas selecionadas
- Seja mais detalhado e profundo na analise deste contexto restrito
`;
} else {
  contextInstruction = `
## MODO DE ANALISE: VISAO GERAL (AUTOMATICO)

O usuario NAO selecionou notas especificas. Voce deve analisar o HISTORICO RECENTE como contexto geral para responder.

**REGRAS PARA MODO AUTOMATICO:**
- Estas sao as 10 notas mais recentes do liderado
- Use-as como "memoria de longo prazo" sobre o comportamento do liderado
- Se a pergunta pedir "resumir estas notas", resuma as notas do historico recente
- Busque padroes e tendencias ao longo do tempo
`;
}

// Inserir no system prompt antes do HISTORICO DE NOTAS
const systemPrompt = `# RHITMO MENTOR 2.0 - CONSTITUICAO

${contextInstruction}

... resto do prompt existente ...

## HISTORICO DE NOTAS (CONTEXT_DOCUMENTS)

${contextLines}
`;
```

---

### Parte 4: Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ContextPicker.tsx` | **NOVO** - Popover para selecao de notas |
| `src/components/MentorChat.tsx` | Adicionar estado `selectedContexts`, area de status, integrar ContextPicker, modificar handleSend |
| `supabase/functions/chat-mentor/index.ts` | Receber `contextMode`, adicionar instrucoes diferenciadas no prompt |

---

### Secao Tecnica

#### Fluxo de Dados

```text
┌──────────────────────────────────────────────────────────────┐
│ MentorChat (Frontend)                                        │
│                                                              │
│  selectedContexts: string[] (IDs das notas selecionadas)     │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                    │
│  │ selectedContexts│  │ selectedContexts│                    │
│  │ = []            │  │ = ['id1','id2'] │                    │
│  │ (Modo Auto)     │  │ (Modo Manual)   │                    │
│  └────────┬────────┘  └────────┬────────┘                    │
│           │                    │                             │
│           ▼                    ▼                             │
│  feedbacks.slice(0,10)   feedbacks.filter(selected)          │
│           │                    │                             │
│           └────────┬───────────┘                             │
│                    │                                         │
│                    ▼                                         │
│           body: {                                            │
│             feedbacks: contextFeedbacks,                     │
│             contextMode: 'auto' | 'manual'                   │
│           }                                                  │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ Edge Function chat-mentor (Backend)                          │
│                                                              │
│  if (contextMode === 'manual') {                             │
│    prompt = "Analise APENAS estas notas selecionadas..."     │
│  } else {                                                    │
│    prompt = "Analise o historico recente..."                 │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

#### Quick Chips: Comportamento Inteligente

| Chip | Modo Auto | Modo Manual |
|------|-----------|-------------|
| "Resumir estas notas" | Resume as 10 mais recentes | Resume apenas as selecionadas |
| "Extrair Acoes" | Extrai acoes do historico recente | Extrai acoes das notas selecionadas |
| "Gerar insights" | Gera insights gerais | Gera insights focados |

A IA entende o contexto porque o `contextMode` modifica as instrucoes do sistema.

#### Estados Visuais da Area de Status

**Modo Automatico (Padrao)**:
```text
┌────────────────────────────────────────────────────────────┐
│ ✨ Modo Automatico: Analisando historico recente          │
└────────────────────────────────────────────────────────────┘
```

**Modo Manual (Notas Selecionadas)**:
```text
┌────────────────────────────────────────────────────────────┐
│ Contexto: [📄 Alinhamento Q4 (x)] [📄 1:1 Janeiro (x)]    │
└────────────────────────────────────────────────────────────┘
```

#### Dependencias Utilizadas

- `@radix-ui/react-popover` (ja instalado)
- `@radix-ui/react-checkbox` (ja instalado)
- `date-fns` (ja instalado)
- `lucide-react` (ja instalado)

