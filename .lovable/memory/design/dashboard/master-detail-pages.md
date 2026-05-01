---
name: Master-Detail Pages
description: /lider/1on1s, /lider/diario, /lider/objetivos usam layout Windmill 280px sticky + título da página dentro da coluna direita; master list nunca duplica nome da página
type: design
---

# Master-Detail (Sprint 12.1)

## Regras de layout (estilo Windmill)

1. **Aside esquerdo** (`MemberMasterList`): largura fixa `w-[280px]` (era 320), sticky `top-0`, `border-r border-border/40`, `bg-card/30`. `overflow-hidden` no container interno para garantir que nada vaze.
2. **Header da master list é SEMPRE genérico**: "Liderados · N pessoas". Nunca o nome da página (1:1s, Diário, Objetivos). A prop `title` foi mantida apenas por compat e é ignorada.
3. **Filtro de times**: `Select` compacto (h-8) dentro da master list. NÃO usar `TeamTabs` aqui — ele tem `Plus Novo Time` e wrap que vazam para fora dos 280px.
4. **Footer "Novo liderado"**: estilo item de menu (`text-xs`, `text-muted-foreground hover:text-foreground`), sem ser CTA destacado.
5. **Coluna direita** (`<main>`): sempre tem `max-w-2xl mx-auto px-6 lg:px-10 py-10 space-y-8`. O **título da página vive aqui**, mesmo no estado vazio (h1 grande + subtítulo).
6. **Quando há liderado selecionado**: o nome da página vira um eyebrow pequeno (`text-[11px] uppercase tracking-[0.18em]`) e o `<h1>` passa a ser o nome do liderado.
7. **EmptyMemberDetail**: ícone outline (`strokeWidth=1.5`, `text-muted-foreground/40`), sem card colorido atrás. Tipografia compacta (`text-lg` título, `text-xs` descrição).
8. **Diário**: privacidade é status inline (`Lock` h-3 + texto pequeno), nunca um banner Card que ocupa espaço.

## Por quê

A primeira iteração colocava o título da página dentro da master list, criando uma "faixa horizontal flutuante" que atravessava as duas colunas e quebrava o paralelo visual. O TeamTabs também vazava para fora dos 320px. O empty state tinha um quadrado lavanda atrás do ícone que parecia "invadir" a timeline. Tudo isso longe da limpeza Windmill/Linear que o produto persegue.
