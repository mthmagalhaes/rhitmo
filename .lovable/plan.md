

## Plano: Smart Date & Trava de Qualidade

### Objetivo

Implementar extração inteligente de datas a partir do conteúdo colado/carregado e criar uma trava de qualidade que obriga o usuário a validar a data antes de salvar.

---

### Estado Atual

| Item | Situação |
|------|----------|
| Estado `occurredAt` | Inicializado com `new Date()` (hoje) |
| Botão Salvar | Habilitado sempre que houver conteúdo |
| Extração de data | Não existe |
| Persistência `occurred_at` | Já funciona corretamente |

---

### Parte 1: Trava de Qualidade (Estado Inicial Vazio)

**Alterações no Estado:**

```typescript
// ANTES
const [occurredAt, setOccurredAt] = useState<Date>(new Date());

// DEPOIS
const [occurredAt, setOccurredAt] = useState<Date | undefined>(undefined);
```

**Alterações no Botão Salvar:**

Adicionar `!occurredAt` à condição de disabled:

```typescript
<Button 
  onClick={handleSubmit} 
  disabled={loading || isProcessingFile || !occurredAt}
>
```

**Alterações na UI:**

- Atualizar o texto de ajuda para indicar obrigatoriedade
- Adicionar estilo visual indicando campo obrigatório quando vazio

---

### Parte 2: Extração Inteligente de Data

**Nova função utilitária `extractDateFromText()`:**

Localização: Dentro do próprio componente (pode ser extraída para `/lib/dateUtils.ts` no futuro)

```typescript
const extractDateFromText = (text: string): Date | null => {
  // Analisar apenas as primeiras 20 linhas
  const lines = text.split('\n').slice(0, 20).join('\n');
  
  // Padrões de regex ordenados por prioridade:
  const patterns = [
    // Tactiq/Meeting Notes: "Meeting started: 15/01/2025"
    /Meeting\s+started:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    
    // ISO Format: 2025-01-15
    /(\d{4})-(\d{2})-(\d{2})/,
    
    // BR Format: 15/01/2025 ou 15-01-2025
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    
    // BR Format curto: 15/01/25
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,
  ];
  
  for (const pattern of patterns) {
    const match = lines.match(pattern);
    if (match) {
      // Parse e validar a data
      // Retornar Date válido ou continuar tentando
    }
  }
  
  return null; // Nenhuma data encontrada
};
```

**Integração com onDrop (upload de arquivo):**

```typescript
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  
  const file = e.dataTransfer.files[0];
  if (file) {
    await handleFileSelect(file);
    // Após extrair texto, tentar detectar data
  }
};

const handleFileSelect = async (file: File) => {
  // ... código existente ...
  const extractedText = await extractTextFromFile(file);
  setContent(extractedText);
  
  // NOVO: Tentar extrair data do texto
  tryExtractDate(extractedText);
};
```

**Integração com onPaste:**

Adicionar handler de paste no RichTextEditor ou na área de conteúdo:

```typescript
const handlePaste = (e: React.ClipboardEvent) => {
  const pastedText = e.clipboardData.getData('text');
  if (pastedText) {
    tryExtractDate(pastedText);
  }
};
```

**Função auxiliar com toast:**

```typescript
const tryExtractDate = (text: string) => {
  const detectedDate = extractDateFromText(text);
  
  if (detectedDate) {
    setOccurredAt(detectedDate);
    toast({
      title: "📅 Data detectada",
      description: `Data de ${format(detectedDate, "dd/MM/yyyy")} encontrada no texto.`,
    });
  }
  // Se não encontrar, não faz nada - campo permanece vazio
};
```

---

### Parte 3: Ajustes de UI

**Campo de Data - Estado Vazio:**

```typescript
<Button
  variant="outline"
  className={cn(
    "w-full justify-start text-left font-normal",
    !occurredAt && "text-muted-foreground border-orange-300"
  )}
>
  <CalendarIcon className="mr-2 h-4 w-4" />
  {occurredAt 
    ? format(occurredAt, "PPP", { locale: ptBR }) 
    : "Selecione a data do ocorrido *"}
</Button>
```

**Texto de Ajuda Atualizado:**

```typescript
<p className="text-xs text-muted-foreground">
  {occurredAt 
    ? "Quando o fato aconteceu" 
    : "⚠️ Campo obrigatório - selecione quando o fato aconteceu"}
</p>
```

---

### Parte 4: Reset do Estado

**No handleSubmit (após salvar):**

```typescript
setContent('');
setMemberId('');
setOccurredAt(undefined); // Resetar para undefined
onOpenChange(false);
```

---

### Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `NewNoteDialog.tsx` | Estado `occurredAt` inicia `undefined`, botão disabled sem data, extração via regex no upload/paste |

---

### Seção Técnica

**Função completa `extractDateFromText`:**

```typescript
const extractDateFromText = (text: string): Date | null => {
  const lines = text.split('\n').slice(0, 20).join('\n');
  
  // Padrão Tactiq: "Meeting started: 15/01/2025" ou "Meeting started 15-01-2025"
  const tactiqMatch = lines.match(/Meeting\s+started:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
  if (tactiqMatch) {
    const [, day, month, year] = tactiqMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  // ISO Format: 2025-01-15
  const isoMatch = lines.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  // BR Format: 15/01/2025
  const brMatch = lines.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  // BR Format curto: 15/01/25
  const brShortMatch = lines.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?!\d)/);
  if (brShortMatch) {
    const [, day, month, year] = brShortMatch;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  return null;
};
```

**Handler de Paste integrado:**

O RichTextEditor usa TipTap. Precisamos adicionar um wrapper `onPaste` na div container ou configurar um evento no editor.

```typescript
// No container da área de conteúdo:
<div 
  className="space-y-2"
  onPaste={(e) => {
    const text = e.clipboardData.getData('text');
    if (text && !occurredAt) {
      tryExtractDate(text);
    }
  }}
>
```

---

### Validação Extra no handleSubmit

Adicionar validação explícita caso o botão seja ativado de alguma forma:

```typescript
if (!occurredAt) {
  toast({
    title: "Campo obrigatório",
    description: "Por favor, selecione a data do ocorrido.",
    variant: "destructive"
  });
  return;
}
```

