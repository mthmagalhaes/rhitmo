# 7 ajustes em /lider/avaliacoes (Rhitmo)

Escopo: só presentation. Zero migração, zero edge function nova, zero RLS, zero custo de IA/Cloud.

## Arquivos tocados

- `src/lib/rhitmoState.ts` — labels + tooltips
- `src/components/leader/avaliacoes/ReviewsCrossMemberTable.tsx` — coluna, ordenação, datas humanizadas, chip-zero, opacity
- `src/components/leader/avaliacoes/ReviewsCoverageInsight.tsx` — banner + bulk action

---

## 1. Renomear chips + adicionar tooltip (`rhitmoState.ts` + tabela)

- `Em construção` → **"Rascunho pendente"** (CTA real, vira âmbar com `animate-pulse` leve).
- `Sem Rhitmo` → **"Sem histórico"**.
- `Confirmado` mantém.
- Adicionar `RHITMO_TOOLTIP` exportado e envolver o `<Badge>` da coluna com `Tooltip` do shadcn (delay padrão).
- Renomear cabeçalho da coluna: **"Estado Rhitmo" → "Cadência"**.

## 2. "Últ. Mensal" humanizado

- Continuar mostrando `abr 2026`, somar sufixo `· há N mês(es)` calculado com a função `monthsAgo` já existente no arquivo.
- Se `monthsAgo >= 2`, adicionar pílula discreta `atrasado` (vermelho `bg-destructive/10 text-destructive`).
- `"—"` quando não houver data (igual hoje).

## 3. Banner do topo alinhado ao mês corrente

Em `ReviewsCoverageInsight.tsx`:

- Texto atual: *"X de Y liderados estão sem o Acompanhamento Mensal deste mês."*
- Novo: *"X de Y sem o Mensal de **mai/2026** (mês corrente)."* — usa `format(new Date(), 'MMM yyyy', { locale: ptBR })`.
- Resolve a contradição percebida vs. a coluna "Últ. Mensal = abr 2026".

## 4. Bulk action "Gerar Mensal para os N"

No mesmo `ReviewsCoverageInsight.tsx`, quando `missing.length >= 3`:

- Adicionar botão primário **"Gerar Mensal para os N"** ao lado da lista de chips.
- Itera client-side `Promise.allSettled(missing.map(m => supabase.functions.invoke('generate-monthly-recap', { body: { member_id: m.id } })))`.
- Toast agregado: *"N Mensais gerados, revise abaixo."* + invalidate `['team-monthly-recaps']` e `['monthly-recaps']`.
- Loading state com `Loader2` no botão. Reaproveita a edge function já existente — sem mudança de backend.

## 5. Esconder chip "Sem Formal 6m+" quando zero

Na linha de filtros da tabela, só renderiza o chip se `counters.noFormal6m > 0`. Reduz ruído.

## 6. Linhas "Em dia" mais leves

Quando `nextAction === 'none'`, aplicar `opacity-60` no `<button>` da linha. O olho vai direto pras que pedem ação. Hover restaura opacity total.

## 7. Ordenação inteligente por padrão

Trocar o `sort((a,b) => a.name.localeCompare(...))` por prioridade composta:

```text
0. rhitmoState === 'B'                       (rascunho pendente — CTA mais quente)
1. lastMonthlyAt nulo OU monthsAgo >= 2     (atrasados)
2. !hasCurrentMonthRecap                     (mês corrente faltando)
3. resto
→ desempate: name.localeCompare(pt-BR)
```

Resultado: líder abre a tela e o que pede ação já está no topo, sem precisar filtrar.

---

## Validação (após implementar)

1. Abrir `/lider/avaliacoes` → coluna se chama **Cadência**, chips renomeados, hover mostra tooltip.
2. Banner cita o mês corrente em pt-BR (ex.: "mai 2026").
3. Com 6 sem mensal, aparece botão **"Gerar Mensal para os 6"**; ao clicar, dispara em paralelo e toast confirma.
4. Linhas "Em dia" aparecem mais claras; rascunhos pendentes ficam no topo.
5. Coluna "Últ. Mensal" mostra `abr 2026 · há 1 mês`; se >2 meses, badge `atrasado`.

## Risco

Baixíssimo. Só UI da página `/lider/avaliacoes`. Bulk action reaproveita `generate-monthly-recap` existente (custo IA = mesmo que clicar 6 vezes manual). Nada quebra fluxo atual: todas as ações antigas continuam funcionando exatamente igual.
