## Escopo

Três ajustes em `/lider/objetivos` e nos componentes de meta (`GoalsManager`, `NewGoalDialog`, `GoalCard`, `GoalsMemberSheet`).

---

### 1. Metas decrescentes (ex: Gross Dollar Retention)

Hoje o progresso é calculado como `current / target`. Para uma meta de "reduzir churn" ou "atingir 87% de GDR" partindo de 91,2%, isso mostra >100% como se já estivesse pronta, quando na verdade ainda está distante do alvo.

**Solução:**
- Adicionar coluna `metric_baseline numeric` em `goals` (valor inicial registrado na criação).
- Adicionar coluna `metric_direction text` com valores `'up'` (default) ou `'down'`, inferida automaticamente na criação: se `metric_current > metric_target` → `'down'`; senão `'up'`. Pode ser sobrescrita manualmente via toggle "Subir / Descer" no `NewGoalDialog`.
- Novo cálculo em `GoalCard.getProgress()` e `useTeamGoalsSummary`:
  - `up`:   `(current − baseline) / (target − baseline)`
  - `down`: `(baseline − current) / (baseline − target)`
  - Clampar entre 0 e 100.
- Label do progresso passa a mostrar `baseline → current → target` para metas decrescentes.

### 2. Modal "Nova Meta" não fecha ao clicar no X

A causa está em `GoalsMemberSheet.tsx`:

```tsx
if (initialNewGoal && open && !newOpen) {
  setTimeout(() => setNewOpen(true), 0);
}
```

Esse bloco roda **a cada render**. Quando o usuário fecha o `NewGoalDialog` (X), `newOpen` vira `false`, o Sheet re-renderiza com `initialNewGoal` ainda `true` e a condição reabre o dialog imediatamente — sensação de "não fecha".

**Solução:**
- Substituir por um `useEffect` que dispare apenas na **transição** de abertura do sheet (deps: `open`, `member?.id`).
- Após abrir o dialog uma vez, marcar `initialNewGoal` como consumido (callback `onInitialNewGoalConsumed` no pai, ou estado local `hasOpenedOnce`).
- Garantir que o X do `NewGoalDialog` só feche o dialog, sem mexer no sheet.

### 3. Meta para múltiplos liderados

Permitir, na página `/lider/objetivos`, criar a mesma meta para vários liderados de uma vez (ex.: meta de equipe de CS aplicada a todos os CSMs).

**Solução de UX:**
- Na `GoalsCrossMemberTable`, adicionar coluna de seleção (checkbox por linha + "selecionar todos").
- Quando ≥1 selecionado, surgir botão flutuante "Nova meta para N liderados" no topo (header da página).
- Reutilizar `NewGoalDialog` com nova prop opcional `memberIds?: string[]` (quando presente, ignora `memberId` único). O submit faz `insert` em batch (`goals.insert(memberIds.map(id => ({...payload, member_id: id})))`).
- Toast: "Meta criada para N liderados". Invalidar `['team-goals-summary']` e cada `['goals', memberId]`.
- O fluxo de criação por liderado único (botão "Nova meta" na linha e dentro do sheet) continua intacto.

> Nota: cada inserção continua sendo uma meta independente (uma linha por liderado). Isso preserva RLS, edição/atualização de progresso por pessoa e o cálculo de cobertura. Não criamos vínculo "meta compartilhada" — se o usuário quiser editar todas depois, edita uma a uma. (Posso evoluir para "meta-grupo" num próximo passo se necessário.)

---

## Mudanças técnicas

**Migration (Supabase):**
```sql
ALTER TABLE public.goals
  ADD COLUMN metric_baseline numeric,
  ADD COLUMN metric_direction text NOT NULL DEFAULT 'up'
    CHECK (metric_direction IN ('up','down'));
```
Backfill: `UPDATE goals SET metric_baseline = metric_current WHERE metric_baseline IS NULL;`
RLS: nada muda (colunas seguem as policies da tabela `goals`).

**Frontend:**
- `src/components/NewGoalDialog.tsx`
  - Aceita `memberIds?: string[]` (multi-insert).
  - Calcula `metric_direction` automaticamente; permite override via toggle.
  - Grava `metric_baseline = metric_current` na criação.
- `src/components/GoalCard.tsx`
  - `getProgress()` usa `metric_direction` + `metric_baseline`.
  - Label adapta texto para metas decrescentes.
- `src/hooks/useTeamGoalsSummary.ts`
  - Lê novas colunas e usa a mesma fórmula no `percentComplete`.
- `src/components/leader/objetivos/GoalsMemberSheet.tsx`
  - Substituir o `if (...) setTimeout` por `useEffect` com guard `hasOpenedOnce`.
- `src/components/leader/objetivos/GoalsCrossMemberTable.tsx`
  - Coluna checkbox + estado `selectedIds`.
  - Novo callback `onBulkNewGoal(ids: string[])`.
- `src/pages/lider/Objetivos.tsx`
  - Estado `bulkSelection`; abre `NewGoalDialog` direto (fora do sheet) quando criando em lote.

**Sem alterações em:** RLS, edge functions, AI router, Slack, billing.

---

## Validação

1. Criar meta "Atingir 87% GDR" com current=91,2 → barra mostra ~46% (não 100%).
2. Abrir sheet → "Nova meta" → clicar X → dialog fecha, sheet permanece aberto. Clicar X do sheet → ambos fecham.
3. Selecionar 3 liderados → "Nova meta para 3" → criar uma vez → aparecer 3 linhas distintas, uma por liderado.