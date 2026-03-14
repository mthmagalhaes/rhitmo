

## Atualização do Design System — 2 arquivos

Substituição direta do conteúdo de `src/index.css` e `tailwind.config.ts` com os tokens fornecidos. Nenhum componente ou página será alterado.

### Alterações

| Arquivo | Ação |
|---|---|
| `src/index.css` | Substituir bloco `:root` completo (novas cores creme/roxo, shadows com rgba, scrollbar Apple-style, radius 12px) |
| `tailwind.config.ts` | Substituir completo (cores success/warning/info/chart, borderRadius expandido, fontSize Apple-inspired, keyframes fade-in/dot-bounce, spacing extra) |

### Mudanças principais nos tokens
- Background: azulado `250 24% 96%` → creme quente `38 25% 95%`
- Foreground: `263 47% 11%` → roxo-preto `258 52% 15%`
- Borders: azulados → quentes (`38 18% 84%`)
- Radius base: `0.5rem` → `0.75rem`
- Shadows: de `hsl()` para `rgba()` com tint roxo
- Novas cores semânticas: `success`, `warning`, `info`
- Tema dark removido (não incluído no novo bloco)
- Scrollbar customizada adicionada

