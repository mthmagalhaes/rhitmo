

# Trimestral funcional para qualquer usuário (novos e existentes)

## Diagnóstico — o fix anterior só corrigiu o rótulo, não o fluxo

Hoje (22/04/2026), o trimestre **vigente** é Q2 2026, mas Q2 mal começou. A correção anterior fez o frontend pedir `period_quarter=2026-04-01` (Q2). O backend então busca mensais entre abril e junho — **e não encontra nenhum**, porque os 3 mensais confirmados do usuário são de Q1 (jan/fev/mar). Resultado: **erro 422 continua**, e qualquer usuário (novo ou antigo) fica travado.

O modelo certo, espelhando o `MonthlyRecapSection` (que já tem `CurrentMonthCard` "em andamento" + meses fechados acionáveis), é:

| Card | Período | Ação |
|---|---|---|
| **Em andamento** (novo) | Trimestre vigente (Q2 2026) | Sem botão. Só badge "Fecha em DD/MM". |
| **Card principal** | **Último trimestre fechado** (Q1 2026) | Gera/calibra/confirma — usa os mensais confirmados de jan/fev/mar. |
| Trimestres anteriores | Q4 2025, Q3 2025, etc. | Read-only (já vinha assim). |

Isso resolve **simultaneamente**:
- Usuário existente: Q1 fica acionável e usa os 3 mensais já confirmados → trimestral gera com sucesso.
- Usuário novo (chegou em abril): vê o "em andamento" de Q2 e a promessa de que assim que confirmar 1+ mensal de Q2 e o trimestre fechar, terá o trimestral. Não vê erro nenhum.
- Usuário em qualquer fuso: cálculo continua UTC-locked.

## Mudanças

### 1. `src/components/recaps/QuarterlyRecapSection.tsx`

- Renomear `getCurrentQuarterStart` → manter como está (calcula Q vigente para o card "em andamento").
- Adicionar `getLastClosedQuarterStart()` — retorna o trimestre **anterior** ao vigente (Q1 quando hoje é Q2). Usa a mesma matemática UTC, mas subtrai 3 meses com tratamento de virada de ano (ex: Q1 → Q4 do ano anterior).
- Criar componente `CurrentQuarterCard` (espelho do `CurrentMonthCard` do mensal): card pontilhado, ícone `Clock`, título "Rhitmo Trimestral — Q2 2026 (em andamento)", badge "Em andamento", subtítulo "Fecha em 02/07/2026" (1º dia do mês após o fim do trimestre + 1).
- Reescrever o `QuarterlyRecapSection` (export default):
  - Renderiza `<CurrentQuarterCard>` no topo.
  - Renderiza o `<QuarterCard>` principal apontando para `getLastClosedQuarterStart()` (acionável: gera, confirma, calibra).
  - Lista "Trimestres anteriores" para todos os recaps no banco que **não** sejam o vigente nem o último fechado (lógica atual já filtra; só atualizar o filtro).
- Manter `quarterLabel()` como está (já é UTC-locked).

### 2. `src/components/recaps/RhitmoTabSummary.tsx`

A badge "Trimestral pronto" também aponta para o trimestre vigente, então tem o mesmo bug semântico. Trocar `getCurrentQuarterStart` por `getLastClosedQuarterStart` nesse arquivo (mesma helper, mesma lógica). A badge passa a acender quando: existem mensais confirmados em Q1 **e** ainda não há recap de Q1 — que é o significado correto de "pronto para gerar".

### 3. `supabase/functions/generate-quarterly-recap/index.ts`

Sem mudança funcional — `lastQuarterStart()` já está correto (retorna Q anterior). Só **defesa adicional** na mensagem de erro 422: incluir o `period_quarter` solicitado para facilitar debug (`"Confirme ao menos um Rhitmo Mensal do trimestre Q1 2026 antes de gerar..."`). Custa 2 linhas e ajuda usuários novos a entender o que precisa ser feito.

### 4. `src/i18n/locales/rhitmo-pt.json` (+ en/es para paridade)

Adicionar 3 chaves novas em `recap.quarterly`:
- `inProgressTitle: "Rhitmo Trimestral — {{quarter}} (em andamento)"`
- `inProgressBadge: "Em andamento"`
- `inProgressDesc: "Fecha em {{date}}. Geração disponível após o trimestre encerrar."`

(en: "in progress" / "Closes on …", es: "en curso" / "Cierra el …".)

## Diagrama do que o usuário vê (depois)

```text
┌──────────────────────────────────────────┐
│ 🕒 Rhitmo Trimestral — Q2 2026 (em       │
│    andamento)         [ Em andamento ]   │
│ Fecha em 02/07/2026.                     │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 📊 Rhitmo Trimestral — Q1 2026           │
│ [Gerar trimestral com IA] ← ACIONÁVEL    │
│ Baseado em 3 mensais confirmados.        │
└──────────────────────────────────────────┘

▸ Trimestres anteriores
  · Q4 2025  · Q3 2025  …
```

## Critério de aceite

- [ ] Em 22/04/2026, usuário existente vê card **"Q2 2026 (em andamento)"** + card **"Q1 2026"** acionável.
- [ ] Botão "Gerar trimestral com IA" no card de Q1 funciona — consome jan/fev/mar e gera o draft.
- [ ] Novo usuário (sem mensais ainda) vê o card "em andamento" de Q2, e o card de Q1 com mensagem "Confirme ao menos um Rhitmo Mensal do trimestre Q1 2026 antes de gerar" (sem 422 silencioso).
- [ ] Badge "Trimestral pronto" no `RhitmoTabSummary` acende quando há mensal confirmado em Q1 e não há recap de Q1 (não mais Q2).
- [ ] Em virada de ano (1º trimestre do ano), `getLastClosedQuarterStart` retorna corretamente Q4 do ano anterior.
- [ ] Em qualquer fuso (BRT, UTC, PST), os trimestres batem com o calendário civil.

