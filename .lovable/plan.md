

## Filtro de Período (Date Range) nas Anotações

### Alterações

**1. `src/components/FeedbackFilters.tsx`** — Adicionar prop `dateRange` + UI do date picker

- Adicionar props `dateRange: DateRange | undefined` e `onDateRangeChange: (range: DateRange | undefined) => void`
- Importar `Calendar`, `Popover/PopoverTrigger/PopoverContent`, `CalendarIcon`, `X` do lucide, `format` do date-fns, `ptBR` locale, `DateRange` do react-day-picker
- Adicionar um `Popover` com botão outline entre os tag chips e o select de ordenação
- Botão mostra "📅 dd MMM - dd MMM" quando range ativo, ou "Filtrar data" quando vazio
- Quando `dateRange` preenchido, mostrar ícone X no botão para limpar
- Calendar com `mode="range"`, `className="pointer-events-auto"`

**2. `src/pages/MemberDetails.tsx`** — Adicionar estado + lógica de filtro

- Novo estado: `const [dateRange, setDateRange] = useState<DateRange | undefined>()`
- Passar `dateRange` e `onDateRangeChange={setDateRange}` para `<FeedbackFilters>`
- No `filteredFeedbacks` useMemo (entre filtro de tags e ordenação), adicionar condição:
  - Se `dateRange?.from` e não `dateRange?.to`: filtrar `>= startOfDay(from)`
  - Se ambos: filtrar com `isWithinInterval` usando `startOfDay(from)` e `endOfDay(to)`
- Adicionar `dateRange` ao array de dependências do useMemo
- Na limpeza de filtros (linha 717), também resetar `setDateRange(undefined)`

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/components/FeedbackFilters.tsx` | Adicionar date range picker UI + props |
| `src/pages/MemberDetails.tsx` | Adicionar estado, lógica de filtro por data, passar props |

### O que NÃO muda
- FeedbackTimeline.tsx (cards, layout, lógica de delete/replicate)
- Queries do banco de dados
- Nenhum outro componente

