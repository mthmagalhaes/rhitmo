

# 3 bugs do Rhitmo Trimestral/Mensal — todos com mesma raiz: timezone + cópia divergente

## Diagnóstico (confirmado no banco e no código)

Banco tem 3 mensais confirmados: **2026-01-01, 2026-02-01, 2026-03-01** (Q1 2026). Hoje é 22/04/2026 → trimestre vigente = **Q2 2026**, último trimestre **fechado** = **Q1 2026**.

| # | O que aparece | O que deveria aparecer | Causa-raiz |
|---|---|---|---|
| 1 | "Rhitmo Trimestral — Q4 2025" | "Rhitmo Trimestral — Q1 2026" | `QuarterlyRecapSection.tsx` linha 34–38 calcula `qStartMonth - 3` (volta 2 trimestres em vez de 1). O `RhitmoTabSummary.tsx` já foi corrigido na task anterior, mas **esse arquivo ficou para trás** — duas cópias da mesma função divergiram. |
| 2 | "Março **De** 2026" | "Março de 2026" | `MonthlyRecapSection.tsx` linha 77 usa `className="capitalize"`, e o CSS `capitalize` capitaliza **toda** palavra — inclusive a preposição "de". |
| 3 | Erro 422 ao gerar trimestral | Trimestral gerado com sucesso | Front pede `period_quarter=2025-10-01` (Q4 2025, por causa do bug #1). Edge function busca mensais entre `2025-10-01` e `2026-01-01`, não acha nenhum (os mensais são Q1 2026), retorna 422 "Confirme ao menos um Rhitmo Mensal do trimestre". O toast renderiza só "Edge Function returned a non-2xx status code" porque o front não lê o body do erro. |

**Bug #3 morre sozinho quando #1 é corrigido**, mas vou também melhorar a mensagem de erro para futuros casos legítimos.

## Mudanças

### Arquivo 1: `src/components/recaps/QuarterlyRecapSection.tsx`

**Substituir** `getCurrentQuarterStart` (linhas 34–38) pela versão correta — idêntica à que já está em `RhitmoTabSummary.tsx`. Sem o `-3`:

```ts
function getCurrentQuarterStart(): string {
  const d = new Date();
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  const m = String(qStartMonth + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-01`;
}
```

Renomear mentalmente para "current" (não "last") fica alinhado: estamos sempre olhando o **trimestre vigente**, e o trimestre anterior já cai no bloco `previous`.

### Arquivo 2: `src/components/recaps/MonthlyRecapSection.tsx`

Trocar a estratégia de capitalização:
- Remover `className="capitalize"` do span do título (linha 77) e do `inProgressTitle` (linha 271)
- Em `formatPeriodMonth` (no `dateLocale.ts`), capitalizar **apenas a primeira letra** do retorno, deixando "março **de** 2026" (lowercase no "de")
- Fazer o mesmo para o `monthLabel` do `CurrentMonthCard` (linha 256) — usar uma helper consistente, ou capitalizar manualmente `s.charAt(0).toUpperCase() + s.slice(1)`

Resultado: "**M**arço de 2026" (✅), nunca mais "Março **D**e 2026".

### Arquivo 3: `src/lib/dateLocale.ts`

Acrescentar uma helper `capitalizeFirst(s: string)` e exportar uma variante `formatPeriodMonthCapitalized` — ou simplesmente aplicar a capitalização dentro do próprio `formatPeriodMonth`. Vou seguir a segunda via (menos API). A função já é UTC-locked (corrige o off-by-one de timezone), só falta a primeira-letra-maiúscula.

### Arquivo 4 (UX, não bug): `src/hooks/useRecaps.ts` — toast de erro

No `useGenerateQuarterlyRecap` (e mensal), quando o `error.context?.body` (Supabase functions) ou `error.message` vier com `"Confirme ao menos um Rhitmo Mensal..."`, mostrar a **mensagem real** em vez de "Edge function returned a non-2xx status code". Pequeno parse defensivo no `onError`.

## O que NÃO vou mexer

- Edge function `generate-quarterly-recap`: a lógica de cálculo de quarter dela está correta (Q1 2026 = `2026-01-01`, mensais entre `2026-01-01` e `2026-04-01`). Quando o front mandar o quarter certo, ela funciona.
- Recaps mensais já gerados — só mudança visual no título.
- Cron de geração automática.

## Critério de aceite

- [ ] Aba "Trimestral" mostra **"Rhitmo Trimestral — Q1 2026"** (não Q4 2025)
- [ ] Clicar "Gerar trimestral com IA" gera com sucesso (consome os 3 mensais confirmados de jan/fev/mar 2026)
- [ ] Títulos mensais aparecem como "Março de 2026", "Fevereiro de 2026", "Janeiro de 2026" — "de" em minúsculo
- [ ] Card "Em andamento" também respeita o padrão ("Abril de 2026")
- [ ] Em qualquer fuso (`TZ=America/Sao_Paulo`, `TZ=Europe/Lisbon`, `TZ=America/Los_Angeles`) o trimestre vigente bate com o calendário
- [ ] Se um líder tentar gerar trimestral sem mensais confirmados, vê a mensagem real ("Confirme ao menos um Rhitmo Mensal..."), não o erro genérico

