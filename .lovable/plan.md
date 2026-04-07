

## Plano: Restaurar "Dicas para Apresentação" nas Avaliações Formais

### Problema
A função `generate-formal-review` (novo fluxo) não busca o `work_style_data` do liderado e não gera a seção "Dicas para Apresentação" que existia no fluxo antigo (`generate-review`). O campo `coaching_tip` já existe na tabela `performance_reviews` e o `ReviewViewDialog` já sabe exibi-lo — mas o novo fluxo simplesmente não o popula.

### Alterações

**1. `supabase/functions/generate-formal-review/index.ts`**
- Buscar `work_style_data` do `team_members` (já faz o select mas não inclui esse campo)
- Após gerar o conteúdo principal da avaliação, fazer uma **segunda chamada à IA** para gerar as "Dicas para Apresentação", passando o perfil Rhitmo Sync do liderado + o conteúdo gerado
- Salvar o resultado no campo `coaching_tip` junto com o `content`

**2. `src/components/review/FormalReviewSheet.tsx`**
- Adicionar exibição do `coaching_tip` acima do conteúdo (mesmo estilo do `ReviewViewDialog`: card azul claro com ícone TrendingUp, `print:hidden`)
- Só exibir quando `coaching_tip` existe e não está em modo edição
- Não exibir para liderado (já é `print:hidden` e a view do liderado é separada)

### Prompt da segunda chamada (coaching tip)
Instruir a IA a gerar dicas de como o líder deve conduzir a conversa de feedback com o liderado, calibrando pelo perfil Rhitmo Sync (estilo de comunicação, preferências). Se o perfil não existir, gerar dicas genéricas com nota de que não há perfil disponível.

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-formal-review/index.ts` | Buscar `work_style_data`, gerar coaching_tip, salvar no DB |
| `src/components/review/FormalReviewSheet.tsx` | Exibir coaching_tip no card azul |

### Notas técnicas
- Sem alterações no banco de dados — campo `coaching_tip` já existe na tabela `performance_reviews`
- A segunda chamada usa o modelo `gemini-2.5-flash` (rápido e barato) para manter o tempo de resposta aceitável
- O coaching_tip é gerado em Markdown (como no fluxo antigo) e renderizado com `ReactMarkdown`

