

## Redesenho da Sidebar com Glassmorphism

### Arquivos alterados (3 arquivos, zero lógica modificada)

**1. `src/components/ui/sidebar.tsx`** — Aplicar glassmorphism no container interno da sidebar

- **Desktop (linha 209)**: Substituir `bg-sidebar` por estilos inline de glassmorphism:
  - `background: rgba(255,255,255,0.55)`
  - `backdrop-filter: blur(16px) saturate(180%)`
  - `border-right: 1px solid rgba(255,255,255,0.3)`
  - `box-shadow: 2px 0 16px rgba(0,0,0,0.04)`
  - Remover `border-r` do wrapper pai (linha 202)

- **Mobile (linha 159)**: Substituir `bg-sidebar` no `SheetContent` pelo mesmo estilo glassmorphism via className override

- **Collapsed/non-collapsible (linha 144)**: Substituir `bg-sidebar` pelo mesmo fundo translúcido

**2. `src/components/AppSidebar.tsx`** — Ajustar classes de hover/active dos menu items

- **Active**: `bg-primary/10` → `bg-[rgba(124,58,237,0.08)]` com `rounded-[10px]`
- **Hover**: `hover:bg-primary/5` → `hover:bg-[rgba(124,58,237,0.05)]`
- Ícones inativos: adicionar `text-muted-foreground`, ativos já usam `text-primary`
- Bloco do usuário no footer: trocar `bg-muted/30` por `bg-white/30` para manter coerência com o vidro

**3. `src/components/ui/sheet.tsx`** — Overlay do mobile drawer

- Reduzir opacidade do overlay de `bg-black/80` para `bg-black/40` para combinar com o efeito translúcido da sidebar mobile

### O que NÃO muda
- Largura, estrutura, navegação, lógica de auth/admin
- Nenhuma página ou componente fora da sidebar
- Fundo do main content

