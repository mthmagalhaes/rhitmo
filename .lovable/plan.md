## Ajuste em `/lider/avaliacoes` — remover duplicidade e usar melhor o espaço

### Problema
A página tem dois seletores que fazem a mesma coisa:
1. **"Gerar avaliação"** — 3 cards grandes (Mensal / Trimestral / Avaliação Formal) no topo
2. **Tabs** logo abaixo (Mensal / Trimestral / Formais)

Você prefere manter apenas as **tabs** (mais sutis) e aproveitar melhor a largura — hoje o conteúdo está espremido em `max-w-3xl`.

### Mudanças em `src/pages/lider/Avaliacoes.tsx`

1. **Remover** o bloco inteiro `Action Bar — gerar avaliação em 1 clique` (h2 + grid de 3 `ActionCard`s) e o componente `ActionCard` no fim do arquivo.
2. **Remover** imports não usados após a limpeza (`Card`, `CardContent`, `Music`, `BarChart3`, `Sparkles` se sobrarem só nas tabs — manter só os necessários para as TabsTrigger).
3. **Preservar a ação "criar avaliação formal"**: já existe `onCreateReview={() => setFormalDialogOpen(true)}` dentro de `PerformanceReviewList` na aba Formais, então o `CreateFormalReviewDialog` continua acessível sem o card.
4. **Largura**: trocar `max-w-3xl` por `max-w-5xl` no container do conteúdo (mantém alinhamento com o resto do app — regra `max-w-5xl` do design system) tanto no estado vazio quanto no estado com liderado selecionado.
5. **RhitmoTimelineCard** continua acima das tabs como contexto/visão geral; o botão "Ver linha do tempo Rhitmo / Jump to Mensal" já leva para a aba Mensal via `onJumpToRhitmo`.

### Resultado
- Hierarquia: Header (avatar + nome) → `RhitmoTimelineCard` → Tabs (Mensal / Trimestral / Formais) → conteúdo da aba.
- Largura confortável (`max-w-5xl`) elimina a sensação de "achatado".
- Geração de Mensal/Trimestral continua dentro das próprias seções (`MonthlyRecapSection` / `QuarterlyRecapSection`); Formal continua via botão "Nova" dentro de `PerformanceReviewList`.

### Fora de escopo
- Não mexer em `MonthlyRecapSection`, `QuarterlyRecapSection`, `PerformanceReviewList` ou `RhitmoTimelineCard`.
- Próxima rodada continua sendo Sprint 12.5 (Bot Rhitmo → LLM no Slack).
