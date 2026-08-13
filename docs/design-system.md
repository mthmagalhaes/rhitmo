# Design System da Rhitmo

Documento de marca autocontido. Serve como briefing para criação de logos, backgrounds, ilustrações e elementos visuais para a landing page e para o produto.

Fonte da verdade no código: `src/index.css`, `tailwind.config.ts`, `src/components/RhitmoLogo.tsx`, `src/components/RhythmWave.tsx`.

---

## 1. Identidade e princípios

**Rhitmo** é um parceiro de liderança nativo em IA. A marca precisa parecer editorial e humana, não "ferramenta de RH corporativa".

Estética: **Creme / Bento**.

- **Soft UI, tátil.** Superfícies brancas flutuando sobre fundo creme quente, sombras difusas em vez de bordas duras.
- **Editorial.** Serifa (Lora) nos títulos, `tracking-tight`, números grandes, labels em caixa alta com tracking largo. Referência: revista de negócios impressa, não dashboard.
- **Quente, não azulado.** Todos os neutros têm base creme/bege (hue ~38). Nunca cinza-azulado frio.
- **Calma com um acento.** Roxo é o único acento cromático forte. Cores semânticas aparecem só quando comunicam estado.
- **Ritmo.** A metáfora central é a onda: camadas de curvas sobrepostas, cadência, repetição regular.

### Anti-padrões (não fazer)

- Gradiente roxo/índigo sobre fundo branco puro (o "AI SaaS genérico").
- Fundo branco `#FFFFFF` em página inteira — o fundo é creme.
- Cinzas frios (`slate-50`, `#F8FAFC`) como superfície principal.
- Ícones 3D, glassmorphism exagerado, neon, glow.
- Inter em tudo sem hierarquia — títulos são serifados.
- Cantos vivos (radius 0) ou cantos totalmente arredondados em cards.
- Sombras duras/pretas (`0 4px 6px rgba(0,0,0,0.3)`).
- Stock photos de gente de terno apontando para gráficos.
- Em textos: evitar travessão (em-dash) em copy de landing page.

---

## 2. Paleta

Todos os valores no código são HSL. O HEX está ao lado para uso em ferramentas de design.

### Light (padrão)

| Token | HSL | HEX | Uso |
|---|---|---|---|
| `--background` | `38 25% 95%` | `#F5F3EE` | Fundo creme quente da aplicação inteira |
| `--card` / `--popover` | `0 0% 100%` | `#FFFFFF` | Superfícies elevadas |
| `--foreground` | `258 52% 15%` | `#1A1035` | Texto principal, roxo-preto |
| `--muted` | `38 20% 91%` | `#EDEAE3` | Superfície neutra secundária |
| `--muted-foreground` | `255 12% 46%` | `#6B6784` | Texto secundário |
| `--accent` | `262 100% 97%` | `#F3F0FF` | Tint roxo leve (hover, chips) |
| `--accent-foreground` | `262 72% 45%` | `#5B21C4` | Texto sobre accent |
| `--border` / `--input` | `38 18% 84%` | `#DCD7CD` | Bordas quentes, nunca azuladas |
| `--ring` | `262 83% 58%` | `#7C3AED` | Foco |

### Primária — Roxo Rhitmo

| Token | HSL | HEX |
|---|---|---|
| `--primary` / `--primary-500` | `262 83% 58%` | `#7C3AED` |
| `--primary-50` | `262 100% 97%` | `#F3F0FF` |
| `--primary-100` | `262 90% 94%` | `#E7E0FD` |
| `--primary-200` | `262 85% 87%` | `#CFC0FA` |
| `--primary-300` | `262 83% 76%` | `#AE93F6` |
| `--primary-400` | `262 83% 66%` | `#9169F1` |
| `--primary-600` | `262 75% 50%` | `#5F20DF` |
| `--primary-700` | `262 70% 42%` | `#4F20B6` |
| `--primary-800` | `262 65% 32%` | `#3C1D87` |
| `--primary-900` | `262 60% 22%` | `#291661` |

`--primary-foreground`: `#FFFFFF`.
`--secondary`: `258 52% 15%` / `#1A1035` (mesma cor do texto — usado em botões escuros, com texto branco).

### Semânticas

| Token | HSL | HEX |
|---|---|---|
| `--success` | `161 73% 33%` | `#179268` |
| `--warning` | `38 92% 50%` | `#F59E0B` |
| `--destructive` | `0 72% 51%` | `#DE2C2C` |
| `--info` | `199 89% 48%` | `#0E9AE8` |

Todas com foreground branco.

### Charts

`--chart-1` `#7C3AED` · `--chart-2` `#0E9AE8` · `--chart-3` `#179268` · `--chart-4` `#F59E0B` · `--chart-5` `#1A1035`

### Sidebar (light)

Fundo `#FFFFFF`, texto `#1A1035`, ativo `--sidebar-accent` `#F3F0FF` com texto `#5B21C4`, borda `38 18% 88%`.

### Dark

| Token | HSL | HEX |
|---|---|---|
| `--background` | `240 10% 11%` | `#1A1A1F` |
| `--card` / `--popover` | `240 10% 15%` | `#22222A` |
| `--foreground` | `250 10% 95%` | `#F0EFF4` |
| `--primary` | `263 86% 76%` | `#A78BFA` |
| `--primary-foreground` | `240 10% 11%` | `#1A1A1F` |
| `--muted` | `240 10% 18%` | `#2C2C36` |
| `--muted-foreground` | `240 5% 60%` | `#9898AA` |
| `--accent` | `263 30% 20%` | `#2E2442` |
| `--accent-foreground` | `263 86% 76%` | `#A78BFA` |
| `--border` / `--input` | `240 10% 20%` | `#2E2E3A` |
| `--success` | `161 73% 38%` | `#1AA878` |
| `--warning` | `38 92% 55%` | `#F7AC1F` |
| `--destructive` | `0 72% 55%` | `#E24141` |
| `--info` | `199 89% 52%` | `#1FA8F2` |

No dark a escala de roxo **inverte**: `--primary-50` é o mais escuro (`263 30% 18%`) e `--primary-900` o mais claro (`263 95% 96%`).
Sidebar dark: fundo `240 10% 11%`, superfície `240 10% 13%`.

---

## 3. Tipografia

Três famílias, todas do Google Fonts.

| Família | Papel | Pesos |
|---|---|---|
| **Lora** (serif) | Títulos H1–H3, wordmark do logo, números de destaque | 400, 500, 600, 700 |
| **Inter** (sans) | Corpo, UI, labels, botões | 400, 500, 600, 700 |
| **Space Mono** (mono) | Numeração de seção (`01 / AGILIDADE`), metadados, dados brutos | 400, 700 |

### Escala (do `tailwind.config.ts`)

| Nome | Tamanho | Line-height | Letter-spacing |
|---|---|---|---|
| `xs` | 11px | 1.5 | — |
| `sm` | 13px | 1.5 | — |
| `base` | 14px | 1.6 | — |
| `lg` | 16px | 1.5 | — |
| `xl` | 18px | 1.4 | — |
| `2xl` | 22px | 1.3 | -0.01em |
| `3xl` | 28px | 1.2 | -0.02em |
| `4xl` | 36px | 1.1 | -0.02em |
| `5xl` | 48px | 1.05 | -0.03em |

Na landing page os títulos escalam além disso (até `text-7xl`, ~72px) com `leading-[1.02]`–`leading-[1.05]`.

### Regras

- Todo título em Lora **bold** com `tracking-tight`. Quanto maior o título, mais negativo o tracking.
- Corpo em Inter 14px/1.6 no app, 16–18px na landing.
- Labels em caixa alta: 10–11px, `font-semibold`, `tracking-[0.16em]` a `tracking-[0.28em]`.
- Números de impacto (`38×`, `3x`, `2 min`) em Lora bold, 72–96px, `leading-[0.9]`.

---

## 4. Forma, sombra e movimento

### Raios

`sm` 6px · **`DEFAULT`/`md` 12px (base do sistema)** · `lg` 16px · `xl` 20px · `2xl` 24px · `3xl` 32px · `full` 9999px

Cards e containers: `rounded-2xl` (24px) ou `rounded-3xl` (32px). Inputs e botões: `rounded-xl` (20px). Chips e badges: `rounded-full`.

### Sombras (light)

Todas usam `rgba(26,16,53,·)` — roxo-preto translúcido, nunca preto puro.

```
--shadow-2xs: 0 1px 2px  rgba(26,16,53,0.03)
--shadow-xs:  0 1px 4px  rgba(26,16,53,0.04)
--shadow-sm:  0 2px 8px  rgba(26,16,53,0.05)
--shadow-md:  0 2px 20px rgba(26,16,53,0.06)
--shadow-lg:  0 8px 30px rgba(26,16,53,0.09)
--shadow-xl:  0 16px 48px rgba(26,16,53,0.11)
--shadow-2xl: 0 24px 64px rgba(26,16,53,0.13)
```

Sombras roxas, exclusivas de CTA em destaque:

```
--shadow-purple:    0 10px 30px -8px  hsl(262 83% 58% / 0.35)
--shadow-purple-lg: 0 20px 50px -12px hsl(262 83% 58% / 0.4)
```

No dark as mesmas curvas usam `rgba(0,0,0,0.15 → 0.45)`.

### Movimento

- Hover em card: `-translate-y-1` + sombra sobe um nível, 150–200ms ease-out.
- `fade-in` 0.2s: opacidade 0→1 com `translateY(4px)→0`.
- `wave-pulse` 1.5s infinito: `scaleY(1 → 1.15)` com opacidade 1→0.9 — usado nas ondas.
- `message-in` 0.3s: entrada de mensagem de chat, `translateY(8px)→0`.
- `dot-bounce` 1.2s: indicador de digitação.
- `shimmer`: varredura horizontal `-120% → 220%` para skeletons.
- `highlight-grow` 0.8s `cubic-bezier(0.25,0.46,0.45,0.94)`: marca-texto crescendo da esquerda.

Nada de bounce elástico, spring exagerado ou parallax pesado. Movimento é discreto e curto.

---

## 5. Assinaturas visuais da marca

### 5.1 RhythmWave — o elemento central

Camadas de curvas senoidais suaves sobrepostas, com opacidade crescente, todas na cor primária. É o DNA visual da Rhitmo: aparece no logo, em divisores de seção e como textura de fundo.

Regras de construção:
- 3 a 7 linhas, dependendo do contexto (logo: 3; divisor: 3; hero: 5; fundo: 7).
- Opacidade base 0.04–0.08, incrementando ~0.04 por linha.
- `stroke-width` decrescente: começa em 2.5 e diminui 0.15 por linha.
- `stroke-linecap: round`, `fill: none`.
- Amplitude cresce por linha: `12 + i * 3`.
- Deslocamento vertical espalha as linhas em torno do eixo central.

Path de referência (viewBox `0 0 1680 H`, `preserveAspectRatio="none"`):

```
M0 {cy}
C140 {cy-a}, 280 {cy+a}, 420 {cy}
S700 {cy-a}, 840 {cy}
S1120 {cy+a}, 1260 {cy}
S1540 {cy-a}, 1680 {cy}
```

### 5.2 Logo

**Wordmark**: a palavra `Rhitmo` em **Lora 700**, `letter-spacing: -0.02em`, na cor do texto (`currentColor`), com **três ondas sobrepostas logo abaixo** na cor primária, com opacidades 0.25 / 0.55 / 0.85 e strokes 3 / 3.5 / 2.5. As ondas ultrapassam levemente a largura do texto de cada lado.

**Icon-only** (viewBox `0 0 40 40`): apenas as três ondas empilhadas, sem texto, opacidades 0.3 / 0.6 / 0.9 e strokes 3 / 3 / 2.5:

```svg
<path d="M4 24 C10 20, 16 28, 22 24 S34 20, 38 24" opacity="0.3"  stroke-width="3"/>
<path d="M2 20 C9 15, 17 25, 24 20 S33 15, 40 20"  opacity="0.6"  stroke-width="3"/>
<path d="M3 16 C10 11, 18 21, 25 16 S35 11, 40 16" opacity="0.9"  stroke-width="2.5"/>
```

Tamanhos do wordmark: sm 100×40 (fonte 26), md 140×52 (fonte 30), lg 180×64 (fonte 38).

Ícone de OAuth/app: 120×120 PNG, três ondas em camadas sobre fundo creme.

### 5.3 Eyebrow editorial (label de seção)

Padrão único em todo o site: um traço horizontal curto seguido de texto em caixa alta.

```
[───]  COMO FUNCIONA
```

11px, `font-semibold`, `uppercase`, `tracking-[0.28em]`, cor neutra secundária, `gap-3` entre traço e texto. É o sinal de "nova seção começando".

Variante numerada em Space Mono para métricas: `01 / AGILIDADE`, 11px, `tracking-[0.25em]`.

### 5.4 Highlight marker

Destaque tipo caneta marca-texto: gradiente roxo a 120°, `0.18 → 0.25` de opacidade, ocupando 40% da altura na base do texto (`background-position: 0 88%`), `font-weight: 600`. Anima crescendo da esquerda para a direita. Existe variante em vermelho para o "antes/problema".

### 5.5 Bento grid

Dashboard e seções de feature usam grid CSS assimétrico: cards de tamanhos diferentes se encaixando, sem scroll horizontal. Cada célula é branca, `rounded-2xl`/`3xl`, sombra `md`, sem borda visível.

### 5.6 Sidebar flutuante e glass

Sidebar do app é `rounded-2xl`, descolada da borda da janela, não uma barra sólida de altura total. Efeito de vidro:

```css
background: rgba(255,255,255,0.55);
backdrop-filter: blur(16px) saturate(180%);
border-right: 1px solid rgba(255,255,255,0.3);
box-shadow: 2px 0 16px rgba(0,0,0,0.04);
```

Dark: `rgba(26,26,31,0.7)` com borda `rgba(255,255,255,0.06)`.

---

## 6. Padrões de layout

- **App**: container principal limitado a `max-w-5xl`. Conteúdo de páginas master-detail em `max-w-3xl`, `px-6 lg:px-8 py-6`.
- **Páginas densas** (1:1s, diário, avaliações): master-detail nativo — lista lateral de 260px com fundo `muted/30` e avatares pequenos (densidade tipo Linear/Notion) + painel de conteúdo à direita. Sem modais que cobrem metade da tela.
- **Auth**: split-screen — arte/marca à esquerda (ondas em escala grande), formulário limpo à direita.
- **Landing**: seções full-bleed alternando fundo creme e fundo escuro `#1A1035`; cada seção abre com eyebrow + título serifado grande.
- **Espaçamento**: escala Tailwind padrão mais `18` (4.5rem) e `22` (5.5rem) para respiro entre seções.

---

## 7. Briefing de pedidos ao Claude Design

Para cada item abaixo, valem as restrições: paleta da seção 2, ondas da seção 5.1, sem gradiente roxo-sobre-branco genérico, fundo sempre creme `#F5F3EE` (ou escuro `#1A1035`) e nunca branco puro em área grande.

1. **Sistema de logo** — wordmark horizontal, versão empilhada, icon-only (favicon 32/64/128), versão monocromática clara e escura, versão para fundo escuro. Manter Lora 700 e as três ondas.
2. **Favicon e app icon** — apenas as ondas, legíveis a 16px: reduzir para 2 ondas se a terceira não sobreviver.
3. **Backgrounds de seção** — texturas de onda em opacidade muito baixa (0.03–0.08), variantes creme e escura, formato 1680×200 e 1680×600, `preserveAspectRatio="none"`.
4. **Divisores entre seções** — onda de 48px de altura, 3 linhas.
5. **Ilustrações de estado vazio** — linha fina, monocromáticas em roxo primário sobre creme, geometria derivada da onda (sem personagens, sem 3D, sem sombras internas).
6. **Ícones de conectores** — molduras consistentes para Google Calendar, Slack, Chrome, Granola, Recall: quadrado `rounded-xl`, fundo branco, sombra `xs`, ícone oficial da marca centralizado (os ícones oficiais nunca são recoloridos).
7. **Capas OG / social** — 1200×630, título em Lora bold sobre fundo creme com ondas ao fundo, logo no canto.
8. **Ilustrações de feature para a landing** — mockups de UI estilizados (card branco `rounded-3xl` com sombra `lg`, conteúdo em Inter 13px), não screenshots reais.
9. **Padrão de avatar** — 24 variantes SVG puras já existem no produto: novas variantes devem seguir a mesma linguagem geométrica e a paleta.
10. **Sistema de badge/chip de origem** — Bot, Upload, Transcrição, Slack, Nota, Granola: mesma altura, `rounded-full`, fundo tint da cor semântica a 10%, texto na cor a 700.
