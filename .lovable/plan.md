

## Atualizar Roadmap Técnico (`rhitmo-plano-tecnico-completo.md`)

### O que será atualizado

O documento está desatualizado — falta refletir as mudanças significativas feitas nas últimas sessões. Vou reescrever o arquivo em `/mnt/documents/` com as seguintes adições:

#### Novos componentes a documentar
| Componente | Descrição |
|-----------|-----------|
| `RhythmWave` | SVG inline reutilizável — motivo visual "rhythm wave" com variantes (hero, divider, background, auth) |
| `WaveDivider` | Divisor de seção orgânico usando wave SVG |
| `AvatarLibrary` | Biblioteca de 24 avatares (12 avataaars + 12 notionists) para liderados |
| `DesignSystem` | Página admin-only (`matheus@rhitmo.co`) com brand kit, paleta, tipografia, downloads |
| `DashboardV2` (migrado) | Dashboard redesenhado com hero strip, overline labels, cards horizontais |

#### Seção 12 — Design System expandida
- Adicionar referência ao **Key Visual**: rhythm wave roxa sobre fundo creme
- Documentar **tipografia atualizada**: Lora (headlines), Inter (body), Geist Mono (dados)
- Documentar **logo redesenhado**: `RhitmoLogo.tsx` com Lora font, wave Bézier, dark mode via CSS vars, prop `iconOnly`
- Documentar **brand assets**: logos (horizontal, vertical, ícone, mono), social templates (IG, LinkedIn, Twitter), PDFs (brand board, paleta, tipografia)

#### Seção 5 — Componentes atualizados
- Mover `RhitmoLogo` para refletir o redesign (Lora font, wave, dark-aware, `size` + `iconOnly` props)
- Adicionar `RhythmWave`, `WaveDivider`, `AvatarLibrary`, `DesignSystem`
- Documentar integração do wave nos hero strips dos 3 dashboards
- Documentar Auth page como branded split-screen

#### Nova seção 16 — Brand Assets
Inventário dos arquivos em `src/assets/` e `/mnt/documents/`

#### Rota nova
| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/design-system` | `DesignSystem` | Brand kit (restrito a `matheus@rhitmo.co`) |

### Arquivo

| Arquivo | Ação |
|---------|------|
| `/mnt/documents/rhitmo-plano-tecnico-completo.md` | Atualizar — adicionar seções 12, 5, 16 e rota |

Nenhuma mudança em código — apenas documentação.

