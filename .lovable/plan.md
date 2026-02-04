

## Plano: DateRange Picker para Avaliações Personalizadas

### Objetivo

Permitir que o gestor selecione intervalos de datas personalizados para gerar avaliações de desempenho, além dos presets fixos (Mensal, Trimestral, etc.). Isso viabiliza a análise de períodos específicos como "Ciclo do Projeto X".

---

### Estado Atual

| Item | Situação |
|------|----------|
| NewReviewDialog.tsx | Apenas botões de preset (1, 3, 6, 12 meses) |
| generate-review Edge Function | Recebe apenas `months`, calcula data limite internamente |
| Componente DateRangePicker | Não existe no projeto |

---

### Parte 1: Componente DateRangePicker

Não é necessário criar um componente separado. O shadcn Calendar já suporta `mode="range"`. Vamos usar o padrão inline no NewReviewDialog.

**Pattern de uso (react-day-picker):**

```typescript
import { DateRange } from "react-day-picker";

const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

<Calendar
  mode="range"
  selected={dateRange}
  onSelect={setDateRange}
  numberOfMonths={2}
/>
```

---

### Parte 2: Alterações no NewReviewDialog.tsx

**Novos imports:**

```typescript
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
```

**Novo estado:**

```typescript
const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
```

**Comportamento Híbrido:**

1. **Clique no Preset** atualiza o DateRange automaticamente:

```typescript
const handlePresetClick = (months: number) => {
  const today = new Date();
  const startDate = subMonths(today, months);
  setDateRange({ from: startDate, to: today });
  setSelectedPreset(months);
};
```

2. **Seleção manual no Calendar** desmarca os presets:

```typescript
const handleDateRangeChange = (range: DateRange | undefined) => {
  setDateRange(range);
  setSelectedPreset(null); // Desmarca preset quando manual
};
```

**UI - DateRangePicker abaixo dos presets:**

```typescript
<div className="space-y-2">
  <Label>Intervalo da Análise</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !dateRange && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {dateRange?.from ? (
          dateRange.to ? (
            <>
              {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {" "}
              {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
            </>
          ) : (
            format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
          )
        ) : (
          "Selecione o período"
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="range"
        selected={dateRange}
        onSelect={handleDateRangeChange}
        numberOfMonths={2}
        locale={ptBR}
        disabled={(date) => date > new Date()}
        className="pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
</div>
```

**Destaque visual do preset selecionado:**

```typescript
<Button
  variant={selectedPreset === months ? "default" : "outline"}
  onClick={() => handlePresetClick(months)}
  // ...
>
```

**Botão "Gerar com IA" separado:**

Adicionar um botão dedicado para gerar a avaliação com o intervalo selecionado:

```typescript
<Button
  onClick={handleGenerateWithRange}
  disabled={generating || !canGenerateReview || !dateRange?.from || !dateRange?.to}
  className="gap-2 w-full"
>
  {generating ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Sparkles className="h-4 w-4" />
  )}
  Gerar Avaliação com IA
</Button>
```

---

### Parte 3: Integração com Edge Function

**Payload atualizado:**

```typescript
const handleGenerateWithRange = async () => {
  if (!dateRange?.from || !dateRange?.to) return;
  
  setGenerating(true);
  
  const fetchPromise = supabase.functions.invoke('generate-review', {
    body: { 
      memberId, 
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString()
    }
  });
  // ... resto do código
};
```

**Alterações no generate-review/index.ts:**

```typescript
// Aceitar startDate/endDate OU months (retrocompatibilidade)
const { memberId, months, startDate, endDate } = await req.json();

let limitDate: Date;
let endLimitDate: Date;

if (startDate && endDate) {
  // Modo Custom Range
  limitDate = new Date(startDate);
  endLimitDate = new Date(endDate);
  console.log(`Período personalizado: ${limitDate.toISOString()} a ${endLimitDate.toISOString()}`);
} else if (months) {
  // Modo Legacy (presets)
  limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() - months);
  endLimitDate = new Date(); // Até hoje
} else {
  return new Response(
    JSON.stringify({ error: 'Informe months ou (startDate + endDate)' }),
    { status: 400 }
  );
}

// Query com range completo
const { data: feedbacks } = await supabase
  .from('feedbacks')
  .select('*')
  .eq('member_id', memberId)
  .gte('occurred_at', limitDate.toISOString())
  .lte('occurred_at', endLimitDate.toISOString())
  .order('occurred_at', { ascending: true });
```

**Atualizar prompt da IA para refletir o período:**

```typescript
const periodDescription = startDate && endDate
  ? `de ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
  : `dos últimos ${months} meses`;

const userPrompt = `FEEDBACKS ${periodDescription}:\n\n${feedbacksText}...`;
```

---

### Parte 4: Título automático para períodos customizados

```typescript
// No NewReviewDialog após receber resposta:
if (selectedPreset) {
  // Usar labels existentes
  setTitle(`Avaliação ${periodLabels[selectedPreset]} - ${currentDate}`);
} else if (dateRange?.from && dateRange?.to) {
  // Período personalizado
  const fromStr = format(dateRange.from, "MMM/yy", { locale: ptBR });
  const toStr = format(dateRange.to, "MMM/yy", { locale: ptBR });
  setTitle(`Avaliação ${fromStr} a ${toStr}`);
}
```

---

### Parte 5: Reset do estado ao fechar

Adicionar `dateRange` e `selectedPreset` ao `handleClose`:

```typescript
const handleClose = () => {
  setTitle("");
  setContent("");
  setCoachingTip(null);
  setGeneratedMonths(null);
  setDateRange(undefined);
  setSelectedPreset(null);
  onOpenChange(false);
};
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `NewReviewDialog.tsx` | Adicionar DateRangePicker, estados, lógica híbrida preset/manual |
| `generate-review/index.ts` | Aceitar startDate/endDate, filtrar com `.lte()` adicional |
| `calendar.tsx` | Adicionar `pointer-events-auto` (já está no projeto) |

---

### Seção Técnica

**Fluxo de dados:**

```text
1. Usuário clica "Trimestral"
   → setDateRange({ from: 3 meses atrás, to: hoje })
   → setSelectedPreset(3)
   → Botões refletem seleção visual

2. Usuário abre calendário e seleciona manualmente
   → handleDateRangeChange(range)
   → setSelectedPreset(null)
   → Presets ficam todos outline

3. Clica "Gerar Avaliação com IA"
   → Envia startDate + endDate para Edge Function
   → Edge Function filtra occurred_at >= startDate AND occurred_at <= endDate
```

**Validação no Edge Function:**

```typescript
if (!memberId) {
  return new Response(
    JSON.stringify({ error: 'memberId é obrigatório' }),
    { status: 400 }
  );
}

if (!months && (!startDate || !endDate)) {
  return new Response(
    JSON.stringify({ error: 'Informe months ou (startDate + endDate)' }),
    { status: 400 }
  );
}
```

**Retorno adicional para o frontend:**

```typescript
return new Response(
  JSON.stringify({ 
    review_content: reviewContent,
    coaching_tip: coachingTip,
    feedbackCount: feedbacks?.length || 0,
    memberName: member.name,
    periodStart: limitDate.toISOString(),
    periodEnd: endLimitDate.toISOString()
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

