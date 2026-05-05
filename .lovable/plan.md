## Objetivo

Duas melhorias visuais no Mentor Chat:

1. **Botão "Pergunte ao Mentor" na sidebar** com mesmo tamanho/alinhamento dos outros itens, mantendo destaque visual sutil.
2. **Aproveitar o espaço da tela** em `/lider/mentor` (launchpad), seguindo o padrão master-detail das outras páginas.

## 1. Sidebar CTA — `src/components/sidebar/SidebarFooterCTA.tsx`

Reescrever para casar exatamente com a métrica do `SidebarMenuButton` (h-8, px-2, gap-2, rounded-md, text-sm), porém mantendo o destaque com gradient leve `from-primary/10 to-primary/5` + borda `border-primary/25` + ícone `Sparkles` em `text-primary`.

Resultado: alinhamento vertical perfeito com Início, 1:1s, Diário etc., mesma altura, ícone na mesma coluna; o destaque vem só da cor de fundo e do ícone primary, sem o "card grande" desproporcional atual.

Remover também o wrapper `px-2 pt-3` em `AppSidebar.tsx` (linha 171) — o CTA passa a viver dentro de um `<SidebarMenu className="px-2 gap-0.5">` próprio com `pt-2 mt-2 border-t border-border/40` para separar visualmente da navegação principal sem exagero.

## 2. Layout do launchpad — `src/pages/lider/Mentor.tsx`

Hoje o conteúdo está preso em `max-w-3xl mx-auto` no centro, deixando enormes faixas vazias dos dois lados (ver screenshot do usuário).

Mudanças:

- Trocar container raiz de `min-h-[calc(100svh-3rem)] bg-background overflow-y-auto` + `max-w-3xl mx-auto px-6 lg:px-8 py-10` por:
  - Root: `h-[calc(100svh-3rem)] overflow-y-auto bg-background`
  - Container: `max-w-5xl px-6 lg:px-8 py-8` **sem `mx-auto`** (alinhado à esquerda, igual aos masters de 1:1s/Diário/Objetivos).
- Reduzir margens superiores grandes: header `mb-6` (era `mb-8`), seção sugestões `mt-6`, conversas `mt-8`.
- Manter o composer e a lista de threads em largura confortável (composer fica natural em `max-w-5xl`; lista de threads idem).

A sub-página `/lider/mentor/:threadId` (`MentorThread.tsx` + `MentorChat` em modo `embedded`) já é full-bleed via `h-[calc(100svh-3rem)]` na linha 1323 do `MentorChat.tsx` — **nenhuma mudança lá**.

## Arquivos afetados

- `src/components/sidebar/SidebarFooterCTA.tsx` — reescrito (compact + alinhado).
- `src/components/AppSidebar.tsx` — wrapper do CTA (linhas 169-174) ajustado.
- `src/pages/lider/Mentor.tsx` — container e espaçamentos do launchpad.

## Fora de escopo

- Lógica de criação de thread, edge functions, prompts, sub-página de chat.
