## Diagnóstico — por que o deck de ontem está fraco

Comparando os três grids lado a lado:

**Decks antigos (17/abr "Lideranças" + 27/abr "FAP") — o que funciona:**
- **Cor com presença:** roxo/índigo vibrante como protagonista (block lateral na capa, círculos decorativos, slide de fechamento full-color). O creme é só pano de fundo.
- **Tipografia editorial confiante:** títulos enormes (≈72–96pt), serif tracking-tight, 2 linhas no máximo. Suporte minúsculo.
- **Estrutura "Ato 01 / Ato 02…":** chips em caps no topo guiam a narrativa como um livro.
- **Slides de impacto ("punch"):** "21 horas.", "De 8 horas para 8 minutos.", "21h por semana." — números gigantes em fundo escuro. Memoráveis.
- **Sandwich dark/light:** capa clara → impactos escuros no meio → fechamento full-purple. Ritmo visual.
- **Conceito > mockup:** quando aparece UI, é um cartão pequeno e estilizado, não domina a tela.
- **Fechamento confiante:** slide inteiro colorido com tagline curta ("Comece pelo ritmo mais simples.").

**Deck de ontem — o que quebrou:**
- Toda página é o mesmo layout: texto à esquerda + mockup à direita. Monótono.
- Sem roxo, sem dark slides, sem punch numbers — perdeu o ritmo emocional.
- Títulos pequenos (≈40pt), competindo com bullets longos.
- Mockups vetorizados ocupam 50% da tela e parecem toy.
- Capa e fechamento sem força — só creme e mockup.

---

## Plano: `onboarding-rhitmo-lider-v2.pptx` (12 slides)

**Diretriz:** copiar o DNA do "Lideranças" (17/abr) — porque o público é o mesmo (líderes pós-signup) — adicionando o estado-da-arte da plataforma atual.

### Sistema visual
- **Paleta:** creme `#F5F0E6` (base), roxo Rhitmo `#6B4FE0` (protagonista, não acento), preto `#0E0E10` (slides escuros), branco off, coral `#E85D3A` só em micro-detalhes.
- **Tipografia:** Lora (serif) para títulos 72–96pt, tracking-tight; Inter para corpo 14–16pt; chips em caps tracking-widest 11pt.
- **Estrutura por slide:** chip "ATO 0X — TEMA" no topo, título grande, 1 sub-frase, e o "elemento visual da vez" (número gigante OU 3 cards horizontais OU mockup pequeno OU bloco roxo).
- **Footer:** "Rhitmo" minúsculo à esquerda, número de slide à direita.

### Roteiro dos 12 slides

```
01 CAPA            "Liderança em ritmo." — split com bloco roxo à direita,
                   eyebrow "Para líderes · Onboarding 12 atos"

02 ATO 01 · MANIFESTO    "A liderança não é um cargo. É um ritmo."
                          + linha-régua roxa, sem mockup

03 ATO 02 · A DOR         PUNCH SLIDE escuro: "21 horas." em 160pt
                          3 stats coral: 68% / 3x / 0

04 ATO 03 · A VISÃO       "Service-as-Software." + 3 cards (Brief · Bias · Nudges)

05 ATO 04 · COMMAND CTR   "Sua manhã, em uma única respiração."
                          mockup pequeno da Home /lider/inicio + 3 KPIs
                          (liderados ativos · notas semana · sinais)

06 ATO 05 · DIÁRIO        "Cada nota é uma evidência."
                          mockup pequeno do Diário/Magic Paste +
                          chip "Sentimento positivo · pedido de coaching"

07 ATO 06 · PRE-MEETING   "Nunca mais entre em uma 1:1 fria."
                          3 cards numerados: Brief no inbox · Pendências ·
                          O que perguntar agora

08 ATO 07 · BIAS + ESPELHO  PUNCH SLIDE escuro:
                            "A IA sublinha o que você não vê."
                            citação destacada com 'agressiva'/'emotiva' grifadas

09 ATO 08 · MENTOR + PULSE  "Um Chief of Staff que nunca esquece."
                            mini-thread Mentor + linha "Pulse: 1 pergunta,
                            1 clique, 0 fricção"

10 ATO 09 · 360 + REVIEWS   PUNCH SLIDE: "De 8 horas para 8 minutos."
                            4 chips: Self · Peer · Upwards · Formal
                            "todo parágrafo cita [doc:UUID]"

11 ATO 10 · INTEGRAÇÕES     "Onde você já está."
                            grid 2x2 minimalista: Slack · Google Calendar ·
                            Recall.ai · Chrome Extension

12 ATO FINAL                FULL ROXO: "Comece pelo ritmo mais simples."
                            3 colunas brancas: Hoje · Esta semana · Em 30 dias
                            footer rhitmo.co
```

### Técnico (build-onboarding-v2.js)
- `pptxgenjs`, slide master 13.333×7.5", tema com tokens `purple/cream/ink/coral`.
- Helpers reutilizáveis: `chipAto()`, `bigTitle()`, `punchNumber()`, `cardRow()`, `microMockup()`, `darkSlide()`, `purpleSlide()`.
- Mockups MUITO menores que no v1 (máx 5"x3"), só como apoio — não como protagonistas.
- Sem RhythmWave nas páginas internas (só capa e fechamento opcional) — para deixar o tipo respirar.

### QA obrigatório
1. `libreoffice → pdf → pdftoppm` → grid 4×3.
2. Comparar grid v2 lado a lado com `grid_old1.jpg` — DNA tem que bater.
3. Checar: nenhum título estourando 2 linhas, punch numbers ≥120pt, dark slides legíveis, fechamento roxo sem texto cortado.
4. Iterar até passar.

Entrega: `/mnt/documents/onboarding-rhitmo-lider-v2.pptx` + presentation-artifact.
