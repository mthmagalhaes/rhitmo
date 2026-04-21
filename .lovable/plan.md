

# Sprint 5 — Sub-abas Mensal/Trimestral, deep-link Rhitmo, fix do "março sumido"

## Resumo dos 3 ajustes

1. **Bug "março não aparece"** — investigação + correção.
2. **Sub-abas dentro da tab Rhitmo**: `Mensal | Trimestral` (com summary acima).
3. **Deep-link "Ver linha do tempo Rhitmo"** funciona mesmo quando o usuário está na aba Diário de Bordo.

---

## 1. Por que março não apareceu (diagnóstico + fix)

Confirmei no banco que o Rhitmo Mensal de **março/2026 existe e está confirmado** (id `f6c9dfd4...`, 8 anotações). A janela de 6 meses está calculada certa (`subMonths(startOfMonth(today), 1)` → mar/2026 como primeiro item).

O que provavelmente aconteceu na sua sessão:
- A screenshot foi tirada **antes** de você confirmar fev/2026. Por isso aparecia "Janeiro confirmado 21/04" — que era na verdade um card com label desatualizado pelo cache do React Query (`staleTime: 0` mas sem refetch ao trocar de aba).
- Não é problema de cron_secret. O cron só roda no dia 02 de cada mês para fechar automaticamente o mês anterior — não tem nada a ver com geração manual.

**Fixes aplicados:**

- **a)** No `useMonthlyRecaps` e `useQuarterlyRecaps`: adicionar `refetchOnMount: 'always'` para garantir que ao trocar de aba a UI sempre puxa o estado atual do banco (pequeno custo, evita cache stale).
- **b)** No `MonthlyRecapSection`: hoje os cards são sempre renderizados na ordem de `buildLast6Months()`. Se o usuário gerar um mês fora dessa janela (ex: mar/2026 quando hoje é mai/2026), o card "some" da UI mesmo existindo no banco. Vou tratar: se houver recap no banco em um mês fora da janela dos últimos 6, ele aparece como **card "histórico"** abaixo dos 6 meses base, em vez de sumir.
- **c)** Corrigir o erro `<div> cannot appear as a descendant of <p>` em `RhitmoTimelineCard.tsx` linha 50 (trocar `<p>` por `<div>` na linha que tem o Badge dentro).

---

## 2. Sub-abas Mensal | Trimestral

Estrutura da tab Rhitmo passa a ser:

```text
[ Aba Rhitmo ]
  ┌─────────────────────────────────────────┐
  │ RhitmoTabSummary (sempre visível)       │
  │  Trimestral · Mensal · Mês em curso     │
  └─────────────────────────────────────────┘
  ┌─────────────────────────────────────────┐
  │ [ Trimestral ] [ Mensal ]  ← sub-tabs   │
  ├─────────────────────────────────────────┤
  │ conteúdo da sub-tab selecionada         │
  └─────────────────────────────────────────┘
```

- Sub-tabs ficam **abaixo** do summary (o summary continua sendo o "GPS" das duas).
- Default abre em **Trimestral** (segue a hierarquia de calibração que já estabelecemos: trimestral primeiro).
- Os botões do summary (`smoothScrollTo('rhitmo-quarterly')` / `'rhitmo-monthly'`) viram **switch de sub-tab + scroll** em vez de scroll puro.
- Visual: usa `Tabs` do shadcn já existente, mantém o padrão Creme/Bento (`rounded-xl`, sem borda dura, fonte editorial).
- Cada sub-tab recebe um `id` (`rhitmo-tab-quarterly`, `rhitmo-tab-monthly`) para o deep-link funcionar.

---

## 3. Deep-link "Ver linha do tempo Rhitmo"

Hoje o `onJumpToRhitmo` faz `el?.click()` no trigger da tab Rhitmo e depois um `scrollIntoView`. Isso falha quando o usuário está na aba "Diário de Bordo" porque o componente `RhitmoTabSummary` ainda nem foi montado (tab content lazy-rendered) — então o scroll não encontra alvo confiável e o `click` do tab trigger funciona mas o `setTimeout` de 100ms não dá tempo do React render.

**Fix:**

- Mudar para `useState`-controlled `Tabs` no `MemberDetails`: estado `activeTab` em vez de `defaultValue`.
- `onJumpToRhitmo` passa a chamar `setActiveTab('rhitmo')` + `setActiveSubTab('monthly')` (já cai na linha do tempo mensal, que é o que o nome sugere) e faz scroll em `requestAnimationFrame` aninhado para garantir que o conteúdo renderizou antes do scroll.
- Como bônus: ao chegar pela URL `?tab=rhitmo&sub=quarterly`, abre direto na sub-tab certa. Útil para nudges/Slack futuros.

---

## Detalhes técnicos

**Arquivos editados:**
- `src/pages/MemberDetails.tsx` — Tabs controlado por estado, deep-link, sub-tabs Mensal/Trimestral, suporte a `?tab=&sub=` na URL
- `src/components/recaps/RhitmoTabSummary.tsx` — botões do summary disparam mudança de sub-tab em vez de scroll puro; aceita callback `onSwitchSection`
- `src/components/recaps/RhitmoTimelineCard.tsx` — corrigir `<p>` com `<div>` filho (DOM nesting)
- `src/components/recaps/MonthlyRecapSection.tsx` — incluir recaps "fora da janela" como cards históricos no fim da lista
- `src/hooks/useRecaps.ts` — `refetchOnMount: 'always'` nos dois hooks de query

**i18n (pt/en/es):**
- `summary.subtabs.quarterly` / `summary.subtabs.monthly`
- `recap.monthly.outOfWindowSection` ("Histórico anterior")

**Sem migration. Sem mexer em edge function. Sem mudar cron.**

## Critérios de aceite

- [ ] Tab Rhitmo abre com summary no topo + sub-abas "Trimestral | Mensal" abaixo
- [ ] Default da sub-aba é "Trimestral"
- [ ] Botões do summary trocam a sub-aba (não só scroll)
- [ ] Clicar "Ver linha do tempo Rhitmo" estando na aba Diário leva para Rhitmo > Mensal sem ficar travado em loading
- [ ] Recap de março/2026 aparece sempre que existe no banco, mesmo que esteja fora dos últimos 6 meses base
- [ ] Sumiu o warning `<div> cannot appear as a descendant of <p>` no console
- [ ] Trocar de tab e voltar mostra o estado atualizado do banco (não cache stale)

