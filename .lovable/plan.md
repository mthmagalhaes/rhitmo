

## Atribuir Avatares por Gênero — Liderados do Matheus

### Problema
O DiceBear gera aparência com base em hash da seed, então "Laís Isfer" pode gerar um avatar masculino. Precisamos mapear manualmente seeds que visualmente correspondam ao gênero.

### Solução
Executar um UPDATE SQL direto no banco, atribuindo seeds da biblioteca (avataaars/notionists) que visualmente combinam com cada pessoa. Mapeamento:

| Membro | Gênero | Estilo | Seed (visualmente correto) |
|--------|--------|--------|---------------------------|
| Gabriela Lucas | F | notionists | Luna |
| Giovanna Barletta | F | notionists | Mia |
| Laís Isfer | F | avataaars | Riley |
| Yasmin Nóbrega | F | notionists | Zara |
| Guilherme Cunha | M | avataaars | Alex |
| Matheus | M | notionists | Felix |

### Execução
Um único script SQL com 6 UPDATEs na tabela `team_members`, definindo o campo `avatar` com a URL DiceBear correspondente e preenchendo o campo `gender` onde estiver vazio.

### Arquivos alterados
Nenhum arquivo de código. Apenas dados no banco via migration.

