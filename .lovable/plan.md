

# Bug crítico: nomes dos meses fora do lugar (off-by-one por timezone)

## Causa-raiz (confirmada no banco)

Confirmei no banco que os recaps existem corretamente:

| `period_month` (banco) | `feedbacks_count` | Aparece no UI como |
|---|---|---|
| `2026-03-01` | 8 | "Rhitmo Mensal — Fevereiro 2026" ❌ |
| `2026-02-01` | 3 | "Rhitmo Mensal — Janeiro 2026" ❌ |

Ou seja, o **dado está certo**. O **render do título está errado por 1 mês**. O Rhitmo Mensal de março **existe** — só está sendo etiquetado como fevereiro.

### Por quê

Em `MonthlyRecapSection.tsx` (linha 57):

```ts
format(new Date(periodMonth + 'T00:00:00Z'), 'MMMM yyyy', { locale: ... })
```

- `new Date('2026-03-01T00:00:00Z')` é parseado em **UTC** (correto)
- `format()` do date-fns renderiza no **timezone local do navegador** (Brasília, UTC-3)
- `2026-03-01 00:00 UTC` = `2026-02-28 21:00 BRT`
- Resultado: `format(..., 'MMMM yyyy')` retorna **"fevereiro 2026"**

Reproduzi com `TZ=America/Sao_Paulo`:
- `'2026-03-01T00:00:00Z'` → `"fevereiro 2026"`
- `'2026-02-01T00:00:00Z'` → `"janeiro 2026"`

O bug afeta **todos os usuários em qualquer fuso oeste de UTC** (toda a América, inclusive Brasil). Em fusos a leste (Europa/Ásia) o bug não aparece — por isso passou batido em alguns testes.

### Outros pontos contaminados pelo mesmo padrão

| Arquivo | Linha | Sintoma |
|---|---|---|
| `MonthlyRecapSection.tsx` :57 | título do card mensal | "Março" vira "Fevereiro" |
| `EvidenceChips.tsx` :35 | data do chip de evidência (`dd/MM`) | `2026-03-01` aparece como `28/02`. Datas com hora ≥ 03:00 UTC sobrevivem (por isso `11/03` na screenshot ficou ok) |
| `QuarterlyRecapSection.tsx` :29-31 | label `Q1 2026` etc | usa `getUTCMonth` na data — esse está correto, falso positivo, não mexer |
| `RhitmoTabSummary.tsx` :22-26 (`getCurrentQuarterStart`) | cálculo do "trimestre atual" | bug separado: faz `qStartMonth - 3`, ou seja, devolve o trimestre **anterior** em vez do atual. Já em produção. |
| `MonthlyRecapSection.tsx` :253-261 (`CurrentMonthCard`) | "Mês em curso" | usa `new Date()` direto, então mostra o mês local correto — OK |

## Correção

### 1. Helper único `formatPeriodMonth(periodMonth, locale)`

Criar um utilitário em `src/lib/dateLocale.ts` (ou novo `src/lib/recapDates.ts`) que **renderiza no fuso UTC**, sem nunca cair na conversão para timezone local:

```ts
export function formatPeriodMonth(periodMonth: string, locale: Locale) {
  // periodMonth = 'YYYY-MM-DD' → parse manual, sem Date()
  const [y, m] = periodMonth.split('-').map(Number);
  // mês em UTC + format com timeZone forçado, OU formatação manual via locale.localize
  return format(new Date(Date.UTC(y, m - 1, 1)), 'MMMM yyyy', {
    locale,
  }).replace(/.*/, (s) => s); // — substituído por abordagem explícita abaixo
}
```

A abordagem **mais segura e zero-dependência de tz**: usar `Intl.DateTimeFormat` com `timeZone: 'UTC'`, que respeita o locale do i18n e não depende do fuso do navegador:

```ts
export function formatPeriodMonth(periodMonth: string, lang: string) {
  const [y, m] = periodMonth.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function formatEvidenceDate(iso: string, lang: string) {
  // iso pode ser 'YYYY-MM-DD' ou ISO completo — fixa em UTC
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00Z') : new Date(iso);
  return new Intl.DateTimeFormat(lang, {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(d);
}
```

(`T12:00:00Z` no caso de data-only garante que mesmo em fusos extremos não há salto de dia.)

### 2. Substituir as chamadas

- `MonthlyRecapSection.tsx` :57 → `formatPeriodMonth(periodMonth, i18n.language)`
- `EvidenceChips.tsx` :35 → `formatEvidenceDate(iso, i18n.language)`

### 3. Corrigir `getCurrentQuarterStart` em `RhitmoTabSummary.tsx`

Trocar `qStartMonth - 3` por `qStartMonth` (era para apontar pro trimestre **vigente**, não o anterior). Manter a versão correta em `QuarterlyRecapSection.tsx` (que já usa `- 3` deliberadamente para "trimestre fechado anterior"; vou conferir contexto antes de mexer e só ajustar se realmente estiver inconsistente — aplicar com cautela).

### 4. Não é necessário tocar no banco

Os registros estão corretos (`period_month = 2026-03-01` significa "março de 2026"). Nenhuma migração, nenhum reprocessamento de IA, nenhum custo de tokens. **Só correção de render**.

## Impacto para usuários atuais

- O **março 2026** do Rhitmo do liderado em questão vai aparecer **com o título correto** assim que a correção subir — sem regenerar nada.
- Mesma correção retroativa para todos os outros líderes/liderados em todos os fusos a oeste de UTC.
- Os chips de evidência com data `YYYY-MM-DD` (ex: `2026-03-01`) deixam de mostrar `28/02`.

## Arquivos alterados

1. `src/lib/dateLocale.ts` — adicionar `formatPeriodMonth` + `formatEvidenceDate`
2. `src/components/recaps/MonthlyRecapSection.tsx` — usar o novo helper no título
3. `src/components/recaps/EvidenceChips.tsx` — usar o novo helper no chip
4. `src/components/recaps/RhitmoTabSummary.tsx` — corrigir `getCurrentQuarterStart` (off-by-one trimestre)

Sem novas dependências. Sem migration. Sem mudança de copy/i18n.

## Critério de aceite

- [ ] Card "Rhitmo Mensal — Março 2026" aparece com título "Março 2026" (não mais "Fevereiro 2026")
- [ ] Card de Janeiro deixa de aparecer; Fevereiro aparece com o conteúdo de fevereiro; Março aparece com o conteúdo de março
- [ ] Chip de evidência com `date = "2026-03-01"` mostra `01/03` (não `28/02`)
- [ ] Em qualquer fuso (testar com `TZ=America/Sao_Paulo`, `TZ=America/Los_Angeles`, `TZ=Europe/Lisbon`) o título do card bate com o `period_month` do banco
- [ ] Trimestre vigente no summary aponta pro Q correto (não pro Q anterior)
- [ ] Nenhuma regeneração de IA precisou ser disparada

