

## Três Ajustes Finos no MentorChat

### Arquivo alterado
`src/components/MentorChat.tsx`

### Ajuste 1 — Bubble do usuário mais sutil (linha 576)
Substituir `bg-[hsl(var(--primary)/0.07)] border border-[hsl(var(--primary)/0.15)]` por `bg-muted/60 border border-border/60`. Remove o tint roxo, mantém tom cinza neutro.

### Ajuste 2 — Sidebar já está em 240px
A sidebar na linha 437 já usa `w-[240px]`. Porém há padding `p-3` e `px-2` internos que podem dar a impressão de ser mais larga. Nenhuma alteração necessária — o container já está correto.

### Ajuste 3 — Ícone do botão send branco puro (linha 704)
Adicionar `text-white` ao ícone `ArrowUp` para garantir contraste no `bg-primary`.

### Resumo de edições

| Linha | De | Para |
|-------|-----|------|
| 576 | `bg-[hsl(var(--primary)/0.07)] border border-[hsl(var(--primary)/0.15)]` | `bg-muted/60 border border-border/60` |
| 704 | `<ArrowUp className="h-4 w-4" />` | `<ArrowUp className="h-4 w-4 text-white" />` |

### O que NÃO muda
- Tudo o mais no MentorChat
- Nenhum outro arquivo

