## Objetivo

Tirar o "cheiro de website" das páginas Master-Detail (`/lider/1on1s`, `/lider/diario`, `/lider/objetivos`) e deixá-las com densidade de SaaS app (Notion/Linear/Windmill): ocupação total da viewport, scroll por coluna, sidebar mais densa e com contraste claro contra a área de trabalho.

## Mudanças

### 1. `src/components/leader/MemberMasterList.tsx` (sidebar — densidade + contraste + altura)

- **Altura**: `h-[calc(100vh-4rem)]` → `h-[calc(100svh-3rem)]` (alinha com a barra real de 48px do `AppLayout` desktop e usa `svh` para mobile correto).
- **Largura**: `w-[280px]` → `w-[260px]` (ganho de 20px na área de trabalho).
- **Fundo**: `bg-card/30` → `bg-muted/30` (contraste mais visível com a coluna direita `bg-background`).
- **Header da lista**: `px-4 pt-5 pb-3` → `px-3 pt-4 pb-2`; eyebrow `text-[11px]` → `text-[10px]`; counter `text-xs mt-1` → `text-[11px] mt-0.5`.
- **Filtro de times**: trigger `h-8 text-xs` → `h-7 text-[11px]`; padding container `px-3 pb-3` → `px-2 pb-2`.
- **Linhas**: padding `px-3 py-2.5` → `px-2.5 py-1.5`; gap `gap-3` → `gap-2.5`; nome `text-sm` → `text-[13px] leading-tight`; cargo `text-xs` → `text-[11px] leading-tight mt-0.5`.
- **Avatar**: `size="md"` (h-10 w-10) → `size="sm"` (h-8 w-8); dot de saúde `h-2.5 w-2.5` → `h-2 w-2`.
- **Atualizar memo**: `Master-Detail Pages` agora documenta `260px / bg-muted/30 / size sm / h-[calc(100svh-3rem)]`.

### 2. `src/pages/lider/OneOnOnes.tsx` (full-bleed + scroll por coluna)

- **Container raiz**: `flex min-h-[calc(100vh-4rem)]` → `flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden` (trava altura, sem scroll do body).
- **`<main>`**: `flex-1 min-w-0` → `flex-1 min-w-0 overflow-y-auto bg-background` (scroll independente da sidebar).
- **Conteúdo interno**: remover `max-w-2xl mx-auto px-6 lg:px-10 py-10` → `max-w-3xl px-6 lg:px-8 py-6` (sem `mx-auto`, alinhado à esquerda; padding mais enxuto). Spacing das seções `space-y-8` → `space-y-6`. Empty state idem.

### 3. `src/pages/lider/Diario.tsx`

Mesmo tratamento:
- Container raiz: `flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden`.
- `<main>`: adicionar `overflow-y-auto bg-background`.
- Conteúdo: `max-w-2xl mx-auto px-6 lg:px-10 py-10` → `max-w-3xl px-6 lg:px-8 py-6`. Spacing `space-y-6` mantido.
- Banner privacidade: padding `px-3.5 py-2.5` mantido (já está enxuto).

### 4. `src/pages/lider/Objetivos.tsx`

Mesmo tratamento (mantém consistência das três páginas Master-Detail).

### 5. Memória

Atualizar `mem://design/dashboard/master-detail-pages.md` e `mem://index.md` — bullet "Master-Detail Pages" — para refletir:
- Sidebar 260px, `bg-muted/30`, avatar `sm`, altura `h-[calc(100svh-3rem)]`
- Páginas usam `overflow-hidden` no root + `overflow-y-auto` na coluna direita (scroll independente, app-feel)
- Conteúdo interno: `max-w-3xl px-6 lg:px-8 py-6` (sem `mx-auto`)

## Fora de escopo

- Não mexer em `AppLayout.tsx` (afetaria todas as outras páginas).
- Não tocar em `MentorChat`, `AgendaBlock`, `OneOnOnePrepCard`, `GoalsManager`, `FeedbackTimeline` (componentes filhos preservam estilo atual).
- Páginas do liderado (`/liderado/*`) ficam fora — escopo é só Master-Detail do líder.

## Arquivos

- editar: `src/components/leader/MemberMasterList.tsx`
- editar: `src/pages/lider/OneOnOnes.tsx`
- editar: `src/pages/lider/Diario.tsx`
- editar: `src/pages/lider/Objetivos.tsx`
- editar: `.lovable/memory/design/dashboard/master-detail-pages.md`
- editar: `mem://index.md`
