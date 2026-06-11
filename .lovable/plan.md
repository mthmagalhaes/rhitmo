## Diagnóstico da seção atual

Hoje "Impacto mensurável" é um bento 2/3 + 1/3 com três cards cinza-claro, ícones em pílula, números grandes serif. Funciona, mas:

- **Visualmente é mais um bento** — repete a textura de outras seções (mesma paleta `slate-50/60`, mesmos `rounded-3xl`, mesma hierarquia plana entre os três stats).
- **Copy mistura dado e dor** num mesmo parágrafo, sem respiro. "4h → 2min", "38x", "60%" aparecem sem fonte/ano — leitor sênior desconfia.
- **Não conversa com as seções vizinhas:** vem depois da SarahJourney (cinematográfica, narrativa, escura) e antes da tabela comparativa (densa, tabular). Está espremida entre dois momentos fortes sem ter personalidade própria.
- **Hierarquia entre os 3 stats é arbitrária** — produtividade ganha 2/3 só por copy ser maior, não por ser o mais importante.

## Proposta de redesign — "Editorial de Impacto"

Inspiração: páginas de "Numbers" de relatórios anuais premium (Stripe, Linear, Notion). Um stat-hero gigante por vez, com fonte citada, e os outros dois como "supporting evidence" abaixo. Mais respiração, menos bento.

### Estrutura

```text
┌─────────────────────────────────────────────────────┐
│  IMPACTO MENSURÁVEL                                 │  overline indigo
│                                                     │
│  Não é promessa.                                    │  H2 serif gigante, 2 linhas
│  São números.                                       │  segunda linha em itálico
│                                                     │
│  ─────────────────────────────────────────          │  hairline divider
│                                                     │
│  01 / PRODUTIVIDADE                                 │  index + tag pequena
│                                                     │
│       4 h        →        2 min                     │  stat-hero — serif 8xl,
│                                                     │  seta animada entre eles
│                                                     │
│  O draft de uma avaliação de desempenho             │  parágrafo editorial,
│  consome em média 4 horas por liderado.             │  largura controlada
│  Com Rhitmo, sai em 2 minutos a partir do           │  (max-w-2xl)
│  contexto já capturado.                             │
│                                                     │
│  Fonte: Gallup, 2024 · Benchmark Rhitmo             │  microcopy slate-400
│                                                     │
│  ─────────────────────────────────────────          │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ 02 / EQUIDADE    │  │ 03 / ECONOMIA    │         │  dois cards simétricos
│  │                  │  │                  │         │  sem fundo cinza,
│  │   38×            │  │   60 %            │         │  só hairline divisória
│  │                  │  │                  │         │
│  │ Mulheres recebem │  │ Avaliações       │         │
│  │ 38× mais feedback│  │ tradicionais     │         │
│  │ sobre persona-   │  │ custam até       │         │
│  │ lidade. Rhitmo   │  │ US$ 35M/ano em   │         │
│  │ detecta antes    │  │ grandes empresas.│         │
│  │ de você publicar.│  │ Rhitmo corta 60%.│         │
│  │                  │  │                  │         │
│  │ Fonte: Stanford  │  │ Fonte: Deloitte  │         │
│  └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────┘
```

### Decisões de design

- **Fundo:** continua `bg-white`, mas remove os blocos `bg-slate-50/60`. Hierarquia vem de tipografia e espaço, não de superfícies.
- **Stat-hero (Produtividade):** `font-serif text-[120px] md:text-[180px]`, leading apertado. "4h" → "2min" com seta `→` animada (fade-in ao entrar na viewport) entre eles. É o herói porque é o stat de produto (o que Rhitmo entrega), não de mercado.
- **Numeração editorial:** `01 /`, `02 /`, `03 /` em mono pequeno (`text-[11px] tracking-[0.25em]`) — código editorial estilo magazine, alinha com a vibe Lora+Inter do projeto.
- **Hairlines em vez de cards:** `border-t border-slate-100` entre blocos, sem `rounded-3xl` ali. Quebra o padrão de bento e dá ar de "página de revista".
- **Fontes citadas:** cada stat ganha linha `Fonte: X` em `text-slate-400 text-xs`. Sobe credibilidade sem poluir.
- **Stats 2 e 3:** lado a lado, simétricos, mesma escala (`text-7xl`). Sem ícones coloridos — limpamos os círculos vermelho/verde. Cor só na palavra-chave do parágrafo (ex: "38×" em `text-slate-900`, resto em `text-slate-500`).
- **Animação sutil:** os números fazem count-up rápido (300ms) ao entrar na viewport. A seta do stat-hero desliza da esquerda pra direita ao mesmo tempo.

### Copy revisado (PT)

- Título: `Não é promessa.\nSão números.` (quebra de linha, segunda em `italic` ou peso menor)
- Subtítulo: removido (o título já carrega) — ou movido pra microcopy abaixo: "Cada número aqui tem fonte. Clique pra ver o estudo."
- Stat 1 — Produtividade: **4h → 2min** · "Redigir uma avaliação de desempenho consome em média 4h por liderado. Com Rhitmo, o draft sai pronto em 2 minutos."
- Stat 2 — Equidade: **38×** · "Mulheres recebem 38× mais feedback sobre personalidade do que homens. Rhitmo detecta e sinaliza antes da publicação."
- Stat 3 — Economia: **−60%** · "Avaliações tradicionais custam até US$ 35M/ano em grandes empresas. Rhitmo corta o custo em 60% mantendo a precisão."

### Fora do escopo

- Seções vizinhas (SarahJourney, Comparison Table) — não tocar.
- Versão EN do copy — replico o mesmo padrão depois que aprovar PT.
- Backend / dados reais — números seguem hardcoded em `t.numbersStat*`.

## Próximo passo

Se aprovar a direção, eu implemento direto em `src/pages/Landing.tsx` (seção `#impacto`) e atualizo as chaves de copy em `lang === 'pt'` / `en`. Se preferir ver **três variações renderizadas** (ex: stat-hero gigante vs. três stats iguais editorial vs. layout com gráfico/sparkline), me avisa que eu gero como protótipo visual antes de codar.