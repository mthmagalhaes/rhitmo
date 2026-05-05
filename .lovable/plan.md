## Objetivo
Em `/lider/avaliacoes`, abas Mensal e Trimestral, transformar cada card de recap em um item colapsável (collapsed por padrão para os meses/quarters antigos), no mesmo padrão visual já usado em "Avaliações Formais" (Collapsible com chevron + label). Assim a tela não fica empilhada com 6 meses abertos de uma vez.

## Padrão visual (referência: `PerformanceReviewList`)
- `Collapsible` do shadcn por item.
- Header clicável: chevron + título do mês/quarter + status pill (Confirmado / Rascunho / Vazio) + meta curta (ex.: "Baseado em 10 notas, 4 1:1s").
- Corpo do card (textareas + EvidenceChips + botões) só renderiza quando expandido.

## Regras de "default open"
- **Mensal:** abre automaticamente apenas o mês mais recente que esteja em `draft` ou `vazio` (precisa ação do líder). Mês em curso (`CurrentMonthCard`) e meses já `confirmed` ficam fechados.
- **Trimestral:** abre automaticamente apenas o último quarter fechado se estiver `draft` ou `vazio`. `CurrentQuarterCard` e quarters confirmados ficam fechados.
- Header sempre mostra o status pill + contagem de evidências mesmo quando fechado, para o líder escanear rápido.

## Mudanças

### `src/components/recaps/MonthlyRecapSection.tsx`
1. Importar `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` e `ChevronDown`.
2. Refatorar `RecapCard`:
   - Wrap inteiro num `Collapsible` com `defaultOpen` calculado (draft/empty do mês mais recente only).
   - `CardHeader` vira `CollapsibleTrigger` (botão full-width, hover sutil) com chevron + título + badge + meta inline.
   - `CardContent` (textareas/botões) dentro de `CollapsibleContent`.
3. `CurrentMonthCard` e o item de "fora da janela" ficam colapsáveis também (defaultOpen=false).
4. Passar prop `defaultOpen` do parent baseado em: primeiro item da lista cujo `recap?.status !== 'confirmed'` (ou ausente).

### `src/components/recaps/QuarterlyRecapSection.tsx`
Mesmo tratamento em `QuarterCard` e `CurrentQuarterCard`. `defaultOpen` no quarter mais recente não-confirmado.

### Sem mudanças
- `Avaliacoes.tsx`, `RhitmoTimelineCard`, hooks, edge functions.
- Tab "Formais" já usa Collapsibles — mantém como está.

## Resultado
Tela limpa: ao abrir a aba Mensal, o líder vê uma lista de linhas (mês + status), com um único item já aberto se houver ação pendente. Click expande qualquer outro mês para revisar/editar. Mesma UX em Trimestral.