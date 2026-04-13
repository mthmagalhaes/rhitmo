

## Plano: Tags Manuais nas Anotações

### O que muda

Hoje as tags são apenas automáticas (geradas pela IA ao salvar). Você quer poder adicionar tags manuais — tanto as pré-definidas (1:1, PDI, Check-in, etc.) quanto tags livres como "Negativa", "Oportunidade de Melhoria", "Risco".

### Solução

**1. Adicionar tags pré-definidas para sinalizações de liderança no `tagConfig.ts`**

Novas tags built-in:
- "Oportunidade de Melhoria" (⚠️, laranja) — sinaliza ponto de atenção/melhoria para o liderado
- "Destaque Positivo" (⭐, dourado) — sinaliza algo que o liderado fez muito bem
- "Risco" (🔴, vermelho) — sinaliza risco operacional ou de retenção

**2. Transformar a seção de tags no `NewNoteDialog.tsx` em um seletor interativo**

Substituir o bloco passivo (linhas 639-667) por:
- Um dropdown/combobox com todas as tags pré-definidas (VALID_TAGS) para seleção rápida
- Um input de texto livre para digitar tags customizadas (Enter para adicionar)
- Tags selecionadas aparecem como badges removíveis (já funciona)
- Tags manuais escolhidas antes de salvar são preservadas e mescladas com as automáticas (as automáticas só preenchem se `tags.length === 0`)

**3. Atualizar filtros no `FeedbackFilters.tsx`**

Adicionar as novas tags pré-definidas ao array `FILTER_TAGS` para que possam ser filtradas na timeline.

### Arquivos a modificar

| Arquivo | Ação |
|---------|------|
| `src/lib/tagConfig.ts` | Adicionar 3 novas tags pré-definidas |
| `src/components/NewNoteDialog.tsx` | Adicionar seletor de tags (dropdown + input livre) |
| `src/components/FeedbackFilters.tsx` | Adicionar novas tags aos filtros |

### Comportamento

- Se o líder seleciona tags manualmente → IA NÃO sobrescreve (já funciona assim, linha 355: `if (tags.length === 0)`)
- Se o líder não seleciona nenhuma → IA classifica automaticamente (comportamento atual mantido)
- Tags customizadas (digitadas) usam estilo neutro padrão (cinza) já existente no `getTagColor` fallback

