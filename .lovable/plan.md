

## Plano: Data Retroativa (Máquina do Tempo)

### Objetivo

Permitir que o gestor indique **quando** o fato ocorreu (`occurred_at`), separando da data de registro (`created_at`). Isso garante que a linha do tempo do colaborador seja fiel aos fatos, independente de quando o gestor parou para digitar.

---

### Estado Atual

| Componente | Status |
|------------|--------|
| Coluna `occurred_at` | NÃO existe - precisa criar |
| `NewNoteDialog.tsx` | Sem DatePicker - precisa adicionar |
| `FeedbackTimeline.tsx` | Usa `created_at` para exibir data - precisa mudar para `occurred_at` |
| `generate-review` Edge Function | Filtra por `created_at` - precisa mudar para `occurred_at` |
| `analyze-feedback-background` | Não filtra por data - OK |
| Componente `Calendar` | Existe e funciona |
| Componente `Popover` | Existe e funciona |

---

### Parte 1: Database (Schema)

**Migração SQL:**
```sql
-- Adicionar coluna occurred_at com default NOW()
ALTER TABLE feedbacks 
ADD COLUMN occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migração de dados: Preencher occurred_at com created_at para registros existentes
UPDATE feedbacks 
SET occurred_at = created_at 
WHERE occurred_at IS NULL;

-- Tornar coluna NOT NULL após migração
ALTER TABLE feedbacks 
ALTER COLUMN occurred_at SET NOT NULL;
```

**Resultado esperado no schema:**
```text
feedbacks (
  ...
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Quando foi digitado
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Quando aconteceu (editável)
  ...
)
```

---

### Parte 2: Frontend (NewNoteDialog.tsx)

**Adicionar DatePicker** entre a seleção de liderado e o campo de upload:

```text
┌───────────────────────────────────────────────────────────────┐
│ 📝 Nova Nota                                              [X] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Liderado                                                      │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Selecione um liderado                               ▼ │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ Data do Ocorrido                                              │
│ ┌───────────────────────────────────────┐                     │
│ │ 📅  30/01/2026                       ▼│  ← NOVO CAMPO      │
│ └───────────────────────────────────────┘                     │
│ Quando o fato aconteceu (default: hoje)                       │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │     Arraste sua transcrição (PDF, Word...)             │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ Conteúdo                                                      │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ [B] [I] [H1] [H2] [•] [1.]                               │   │
│ │ ...                                                      │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│                               [Cancelar]  [Analisar e Salvar] │
└───────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Default: Data de hoje
- Permite selecionar datas passadas (retroativas)
- Bloqueia datas futuras (não faz sentido registrar fato que não aconteceu)
- Formato brasileiro: `dd/MM/yyyy`

**Alterações no código:**
1. Adicionar estado `occurredAt` (tipo `Date`)
2. Importar `Calendar`, `Popover`, `PopoverTrigger`, `PopoverContent`
3. Adicionar componente DatePicker entre seleção de liderado e área de upload
4. Enviar `occurred_at` no INSERT para a tabela feedbacks

---

### Parte 3: Frontend (FeedbackTimeline.tsx)

**Alteração na exibição de data:**

Mudar de:
```typescript
// Linha 129 - Antes
<span>{new Date(feedback.created_at).toLocaleDateString('pt-BR')}</span>
```

Para:
```typescript
// Depois - Usar occurred_at como data principal
<span>{new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR')}</span>
```

**Adicionar interface `occurred_at`:**
```typescript
interface Feedback {
  ...
  occurred_at?: string;  // Nova coluna
}
```

---

### Parte 4: Edge Functions (Inteligência)

**generate-review/index.ts (linha 41-42):**

Mudar de:
```typescript
// Antes - Filtra por created_at
.gte('created_at', limitDate.toISOString())
.order('created_at', { ascending: true });
```

Para:
```typescript
// Depois - Filtra por occurred_at
.gte('occurred_at', limitDate.toISOString())
.order('occurred_at', { ascending: true });
```

**Contexto para IA (linha 68-72):**

Mudar de:
```typescript
const date = new Date(f.created_at).toLocaleDateString('pt-BR');
```

Para:
```typescript
const date = new Date(f.occurred_at || f.created_at).toLocaleDateString('pt-BR');
```

---

### Resumo das Alterações

| Arquivo/Local | Alteração |
|--------------|-----------|
| **Database** | `ALTER TABLE feedbacks ADD COLUMN occurred_at` |
| **Database** | Migrar dados: `UPDATE feedbacks SET occurred_at = created_at` |
| `src/components/NewNoteDialog.tsx` | Adicionar DatePicker com label "Data do Ocorrido" |
| `src/components/FeedbackTimeline.tsx` | Exibir `occurred_at` em vez de `created_at` |
| `supabase/functions/generate-review/index.ts` | Filtrar por `occurred_at` |

---

### Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Máquina do Tempo                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Gestor seleciona data → "15/Jan/2026"                          │
│                          ↓                                      │
│  Salva no banco:                                                │
│    created_at = 30/Jan/2026 (hoje, automático)                  │
│    occurred_at = 15/Jan/2026 (escolhido pelo gestor)            │
│                          ↓                                      │
│  Timeline exibe: "15 de janeiro de 2026"                        │
│                          ↓                                      │
│  IA gera avaliação:                                             │
│    "Trimestral" = feedbacks com occurred_at >= (hoje - 3 meses) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Seção Técnica

**Implementação do DatePicker no NewNoteDialog:**

```typescript
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Estado
const [occurredAt, setOccurredAt] = useState<Date>(new Date());

// Componente
<div className="space-y-2">
  <Label>Data do Ocorrido</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !occurredAt && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {occurredAt ? format(occurredAt, "PPP", { locale: ptBR }) : "Selecione a data"}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={occurredAt}
        onSelect={(date) => date && setOccurredAt(date)}
        disabled={(date) => date > new Date()}
        initialFocus
        className="p-3 pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
  <p className="text-xs text-muted-foreground">
    Quando o fato aconteceu (padrão: hoje)
  </p>
</div>

// No INSERT (handleSubmit)
.insert({
  manager_id: user.id,
  member_id: targetMemberId,
  content: content.trim(),
  type: 'neutral',
  occurred_at: occurredAt.toISOString(), // ← Nova coluna
  ...
})
```

**Fallback para dados antigos:**

O código usa `occurred_at || created_at` para garantir compatibilidade com feedbacks antigos que não tinham a coluna preenchida (embora a migração preencha todos).

