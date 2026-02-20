

## Correção: Truncamento de Nomes nos TeamMemberCards

### Problema

A classe `truncate` no `h3` do nome está forçando nomes longos a serem cortados com reticências. A combinação de `min-w-0` no container pai com layout flex contribui para a limitação.

### Solução

Uma edição simples no arquivo `src/components/TeamMemberCard.tsx`:

1. **Remover `truncate`** da classe do `h3` do nome (linha 68)
2. **Adicionar `break-words`** para permitir quebra de linha natural em nomes longos
3. **Remover `min-w-0`** do container pai do nome (linha 64), pois essa classe força o encolhimento do conteúdo no flex

### Detalhes Técnicos

**Arquivo: `src/components/TeamMemberCard.tsx`**

Linha 64 -- container do nome e cargo:
```text
// Antes:
<div className="flex-1 min-w-0">

// Depois:
<div className="flex-1">
```

Linha 68 -- titulo do nome:
```text
// Antes:
<h3 className="font-bold tracking-tight text-lg text-foreground truncate">

// Depois:
<h3 className="font-bold tracking-tight text-lg text-foreground break-words">
```

O cargo (role) na linha 76 nao tem `truncate`, mas se beneficia da remocao do `min-w-0` para nao ser comprimido.

### O que NAO muda

- Tamanho do card permanece igual
- Hover lift e sombra continuam funcionando
- Indicador de saude (circulo colorido) nao e afetado
- Layout geral do grid de cards permanece intacto
