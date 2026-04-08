

## Redesign Rhitmo — Integração do Key Visual (Rhythm Wave) no App

### Diagnóstico AS-IS

Após auditar as 10+ páginas principais do app, identifiquei as seguintes oportunidades de melhoria inspiradas pelo criativo `rhitmo-social-twitter.png` (onda rítmica roxa sobre fundo creme com tipografia editorial):

**O que falta hoje:**
1. **Hero strips são planas** — `bg-primary/5` com texto, sem identidade visual forte. Nenhuma referência ao motivo "rhythm wave" que define a marca
2. **Auth page** usa foto stock genérica com overlay roxo — desperdiça a oportunidade de branded experience
3. **Landing page** não tem nenhum elemento da rhythm wave — é funcional mas genérica
4. **Sidebar** usa logo SVG simples de texto — sem expressão gráfica
5. **Transições entre seções** são abruptas (border-b reto) — sem fluidez orgânica
6. **Cards e métricas** seguem o sistema Creme/Bento corretamente, mas falta um "fio condutor" visual que una tudo

### Conceito do Redesign: "Rhythm Wave como DNA Visual"

Inspirado diretamente no Twitter header: a **onda senoidal roxa** com múltiplas camadas de opacidade sobre fundo creme se torna o motivo recorrente em todo o app — como um heartbeat visual que aparece em hero strips, divisores de seção, backgrounds de auth, e landing page.

### Mudanças Planejadas

#### 1. Componente `RhythmWave` reutilizável (NOVO)
SVG inline que renderiza a onda rítmica com 3-5 linhas onduladas em tons de roxo (#7C3AED) com opacidades variadas (0.08, 0.15, 0.25, 0.4). Props: `height`, `opacity`, `className`, `variant` (hero | divider | background).

#### 2. Hero Strips dos 3 Dashboards — Rhythm Wave como background
- **Líder** (`Index.tsx`): Substituir `bg-primary/5` por gradiente creme + rhythm wave SVG posicionada atrás do texto de saudação, com opacity baixa (0.08-0.12). Mantém TODO o conteúdo funcional (greeting, badges, metrics, buttons)
- **Liderado** (`DirectReportDashboard.tsx`): Mesmo tratamento — wave sutil atrás do "Olá, {nome}!"
- **RH Admin** (`HRDashboard.tsx`): Wave mais contida, apenas no hero strip "Visão Geral"

#### 3. Auth Page — Branded split screen
Substituir a foto stock por um layout visual inspirado no Twitter header:
- Lado esquerdo: fundo creme (#F5F3EE) com rhythm wave em escala grande + logo Rhitmo centralizado + tagline "AI-Native Leadership Partner"
- Mantém formulário no lado direito intacto (zero mudanças funcionais)

#### 4. Landing Page — Rhythm wave como hero background
- Adicionar rhythm wave como elemento decorativo atrás do hero text
- Usar como divisor entre seções (substituindo borders retos por ondas suaves)

#### 5. Sidebar — Wave accent
- Adicionar uma micro rhythm wave (2 linhas) como separador decorativo entre o logo e os menu items

#### 6. Section dividers globais
- Criar um componente `WaveDivider` que substitui `border-b border-border/50` por uma wave SVG sutil entre seções

### Regras de preservação (CRÍTICO)
- **ZERO** mudanças em funcionalidades, queries, handlers, dialogs
- **ZERO** mudanças em RLS, banco, edge functions
- Todos os botões, dropdowns, tooltips, badges permanecem idênticos
- Paleta de cores Rhitmo (#7C3AED, #F5F3EE, #1A1035) preservada — apenas adicionando layers de wave
- Tipografia (Lora serif, Inter body, Space Mono data) preservada

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/RhythmWave.tsx` | **Novo** — Componente SVG reutilizável com variantes |
| `src/components/WaveDivider.tsx` | **Novo** — Divisor de seção com wave sutil |
| `src/pages/Index.tsx` | Edit — Hero strip com wave background |
| `src/components/dashboard/DirectReportDashboard.tsx` | Edit — Hero strip com wave background |
| `src/pages/HRDashboard.tsx` | Edit — Hero strip com wave background |
| `src/components/Auth.tsx` | Edit — Split screen esquerdo com wave + logo (sem foto stock) |
| `src/pages/Landing.tsx` | Edit — Hero section + section dividers com wave |
| `src/components/AppSidebar.tsx` | Edit — Micro wave entre logo e menu |

### Notas técnicas
- SVG inline puro (sem imagens externas) — melhor performance e controle de cor via `currentColor`/CSS
- Wave usa `path` com curvas Bézier para manter fidelidade ao criativo original
- `pointer-events: none` e `position: absolute` para não interferir com cliques
- Responsive: wave escala via viewBox, não pixels fixos

