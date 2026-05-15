## Remover chips "PDI" e "Risco" dos filtros

### Mudança
Remover as entradas `PDI` (🚀) e `Risco` (🔴) do array `FILTER_TAGS` em **dois arquivos** (mesma lista duplicada):

1. `src/components/leader/diario/DiaryFilters.tsx` — chips do `/lider/diario` (o que aparece no screenshot)
2. `src/components/FeedbackFilters.tsx` — chips na timeline da página `/member/:id`

Lista resultante (5 chips): `1:1`, `Check-in`, `Feedback Difícil`, `Oportunidade de Melhoria`, `Destaque Positivo`.

### Notas
- Mudança puramente de UI nos filtros. Tags `PDI` e `Risco` ainda existem em `tagConfig.ts` e podem ser aplicadas pelo classificador AI ou tagging manual — só somem como atalho de filtro.
- Sem migração, sem mudança de schema, sem mexer em backend.

### Pergunta
Aplico nos **dois** lugares (Diário + MemberDetails) ou só no Diário (screenshot)?