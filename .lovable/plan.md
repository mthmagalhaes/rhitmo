
O usuário quer melhorar a visualização da tabela de preview no `BulkOnboardDialog` — hoje colunas ficam cortadas (vide "Enfer...", "Fisiote...", "Peda...", "Coor...").

## Fix proposto

Duas melhorias complementares em `src/components/admin/BulkOnboardDialog.tsx`:

1. **Alargar o modal** de `sm:max-w-2xl` (atual) para `sm:max-w-6xl` — aproveita melhor telas médias/grandes sem virar página cheia.

2. **Scroll horizontal na tabela** — envolver a tabela num wrapper `overflow-x-auto` e dar `min-w-[900px]` + `whitespace-nowrap` nas células, garantindo que em qualquer viewport o usuário veja tudo (role horizontal se precisar).

3. **Altura máxima controlada** — manter `max-h-[70vh] overflow-y-auto` no corpo pra não estourar verticalmente quando tiver 100 linhas.

## Arquivo

- `src/components/admin/BulkOnboardDialog.tsx` — ajustar `DialogContent` className e o wrapper da tabela de preview (~5 linhas)

Zero edge functions, zero migrations.
