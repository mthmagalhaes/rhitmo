## Problema

Em `/lider/avaliacoes`, ao clicar num liderado a URL vira `/lider/avaliacoes/:memberId` e o detalhe toma a área principal — mas não há botão de voltar visível no desktop (o `X` do `ReviewsMemberDetail` é `lg:hidden`). O usuário fica preso no detalhe. Além disso, o visual está corporativo demais comparado ao editorial refinado da landing (`rhitmo.co`).

## Escopo

Só UX/visual de `/lider/avaliacoes` e do detalhe do liderado. Sem mexer em dados, RPCs, wizard ou lógica de review.

## Mudanças

### 1. Navegação de volta (o principal)

**`ReviewsMemberDetail.tsx`** — header do detalhe ganha:
- Breadcrumb clicável no topo: `Avaliações › {Nome}` (link para `/lider/avaliacoes`).
- Botão **"← Voltar para avaliações"** (variant ghost, `rounded-full`, ícone `ArrowLeft`) visível em **todos os breakpoints** (não mais `lg:hidden`).
- Atalho de teclado `Esc` fecha via `onClose()` (listener no componente).

**`MemberMasterList`** — na lista, o item ativo continua destacado; clicar nele novamente também desseleciona (chama `onSelect` mas Avaliacoes trata como toggle → navega para `/lider/avaliacoes`).

### 2. Refino visual estilo landing

A landing usa: `rounded-3xl`, gradientes suaves `from-primary/10 via-primary/5 to-transparent`, blur bolhas decorativas, `shadow-xl`/`shadow-[0_2px_28px_rgba(0,0,0,0.05)]`, chrome de janela (3 dots) em mockups, `font-serif` editorial em H1/H2, `highlight-marker` em números-chave.

Aplicar na página cross-member (empty state) e na tabela:

- **Hero cross-member** (empty state): virar um bloco editorial no estilo dos heroes da landing — gradiente `from-primary/10 via-primary/5 to-transparent`, bolha `blur-3xl` decorativa, eyebrow "Rhitmo Formal" com ícone em pill `rounded-xl bg-primary/15`, H1 `font-serif` maior (`text-3xl lg:text-4xl`), subcopy larga (`max-w-2xl`). Mesma linguagem do `FormalReviewHero`.
- **`ReviewsCrossMemberTable.tsx`**: `rounded-3xl` (era `rounded-2xl`), shadow suave, header da tabela com `bg-muted/20` mais leve, chips-filtro viram `rounded-full` com contador em pill destacada estilo landing.
- **`FormalReviewHero`**: já está próximo; pequenos ajustes de consistência (mesmo padding/shadow tokens da landing).
- **Coverage insight** (`ReviewsCoverageInsight`): passar para `rounded-3xl` com o mesmo padrão de gradient sutil.

### 3. Densidade e respiro

- `max-w-3xl` do detalhe → `max-w-4xl` para caber melhor o hero editorial.
- Espaçamento `py-6` → `py-8` no detalhe e no empty state.

## Arquivos

- `src/components/leader/avaliacoes/ReviewsMemberDetail.tsx` — header com breadcrumb + botão voltar sempre visível + Esc.
- `src/pages/lider/Avaliacoes.tsx` — refino do empty state (hero editorial), `max-w-4xl`, toggle de seleção na master list.
- `src/components/leader/avaliacoes/ReviewsCrossMemberTable.tsx` — `rounded-3xl`, shadow, chips refinados.
- `src/components/leader/avaliacoes/ReviewsCoverageInsight.tsx` — tokens visuais consistentes com a landing.
- `src/components/leader/avaliacoes/FormalReviewHero.tsx` — pequenos ajustes de paridade visual.

## Fora do escopo

Wizard de criação da Formal, notificações, mensal (accordion mantém comportamento), dados/queries, mobile Sheet da master list.
