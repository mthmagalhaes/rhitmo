

## Atualizar Logo Rhitmo — Design System V2 + Dark Mode

### O que muda

O `RhitmoLogo.tsx` atual usa `<text>` SVG com `system-ui` — uma fonte genérica que não reflete o design system (Lora para headings). Vamos redesenhá-lo para ficar consistente com o key visual (rhythm wave + tipografia editorial).

### Novo `RhitmoLogo.tsx`

- **Tipografia**: Trocar `system-ui` por `Lora` (a fonte serifada do design system) — mais editorial e alinhado com o brand board
- **Wave line**: Refinar a onda com curvas Bézier mais suaves, inspirada no motivo do `rhitmo-social-twitter.png` (múltiplas linhas com opacidades variadas)
- **Cores**: Usar `currentColor` para texto + `hsl(var(--primary))` para a wave — funciona automaticamente em light e dark mode
- **Dark mode**: Como usa CSS variables (`--primary`, `--foreground`), adapta automaticamente. No dark, `--primary` vira `#a78bfa` (lilás claro) e `currentColor` herda o foreground claro
- **Collapsed sidebar**: Quando sidebar está em modo ícone, mostrar apenas a wave (sem texto) como marca reduzida

### Impacto

O componente é usado em 8 locais (Sidebar, Auth, Landing, Onboarding, Admin, Legal, Invite). Todos herdam a mudança automaticamente via `className="text-primary"` ou `text-foreground`.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/RhitmoLogo.tsx` | Reescrever — Lora font, wave refinada, dark-aware |

Nenhum outro arquivo precisa mudar — todas as instâncias já passam `className` com cores via CSS variables.

