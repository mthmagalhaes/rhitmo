## Nova seção: "Conheça a Ana. A jornada dela com a Rhitmo."

Inspirada diretamente nos prints da Windmill. Substitui a `WeekTimelineSection` atual. A tese é a mesma (uma semana/trimestre na vida do líder com Rhitmo trabalhando em background), mas a entrega vira **storytelling cinematográfico** em vez de comparativo tabular.

### Estrutura visual (1 ato visível por vez + pager de 5)

```
How it works  (overline cinza, pequeno)

Conheça a Ana.
A jornada dela com a Rhitmo.            ← H2 Lora, gigantesco, 2 linhas

Do primeiro dia à primeira avaliação formal,
a Rhitmo trabalha em background.        ← sub cinza

┌─────────────────────────────────────────────────────────┐
│  [foto cinematográfica noturna, escritório, luz quente] │
│                                                          │
│  SEMANA 1                              ┌──────────────┐ │
│                                        │ Rhitmo  APP  │ │
│  Ana entra no time                     │ Oi @Ana...   │ │
│                                        │              │ │
│  Antes do líder lembrar, a Rhitmo      │ Ana          │ │
│  manda um check-in no Slack. O líder   │ Tá indo bem..│ │
│  vê o gap antes da próxima 1:1.        └──────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘

         ●─────○─────○─────○─────○
         1     2     3     4     5
      Onboarding  1:1s  Feedback  Review  Calibração (não temos calibração, remover e ajustar implementação)
```

Um único card grande por vez, foto edge-to-edge dentro do card, overlay escuro à esquerda com texto branco, mockup pequeno do produto flutuando à direita. Pager de 5 numerados embaixo (clicáveis + auto-advance opcional).

### Os 5 atos (PT)

1. **Semana 1 · Ana entra no time** — Foto: escritório noturno com cidade ao fundo (a `landing-cinematic-office.jpg` que já temos). Mock: DM Slack do bot Rhitmo perguntando "como tá a primeira semana?" com resposta da Ana.
2. **Semanal · 1:1s que se preparam sozinhas** — Foto: bar/loft escuro, pessoas conversando ao fundo. Mock: card "Pauta da 1:1 — Ana / Matheus" com 3 bullets (follow-up de doc, PR elogiada, capacity check).
3. **Contínuo · Feedback no calor do momento** — Foto: pôr do sol/praia (já temos `landing-pier-sunset.jpg` ou similar). Mock: thread Slack com Rhitmo perguntando ao colega "viu a Ana fechar a sprint, como ela mandou?".
4. **Fim do trimestre · Review já escrita** — Foto: escritório no golden hour, mesas vazias. Mock: card "Performance Review · Q1 2026 · Ana · IC3" com badge "Exceeds" + chips "8 evidências · 3 peer reviews".
5. **Empresa · Decisões justas e auditáveis** — Foto: lago/dock noturno. Mock: matriz 3x3 de Calibração (LOW/MED/HIGH × LOW/MEETS/EXCEEDS) com avatares dos liderados nos quadrantes.

### Decisões de design

- **Card único grande:** `rounded-3xl`, full-bleed da foto, ~`aspect-[16/9]`em desktop, mínimo`min-h-[420px]` em mobile (texto empilha embaixo da foto).
- **Overlay:** gradiente preto `from-black/85 via-black/40 to-transparent` da esquerda pra direita pra garantir contraste do texto.
- **Texto sobre foto:** overline branca translúcida (`text-white/60 text-xs uppercase tracking-[0.25em]`), H3 Lora branco `text-3xl md:text-4xl`, parágrafo branco `text-white/85 max-w-md leading-relaxed`.
- **Mockup flutuante:** card branco `rounded-2xl shadow-2xl`, posicionado `absolute right-6 md:right-10 bottom-10 md:top-1/2 md:-translate-y-1/2`, largura ~340px, contém componentes Slack-like ou cards do Rhitmo (mesmos mini-mocks que já temos no `WeekTimelineSection.tsx` — reaproveito).
- **Pager:** linha de 5 chips pílula centralizada embaixo. Ativo: `bg-slate-900 text-white` com label visível ("Onboarding"). Inativos: círculo `border border-slate-200 text-slate-400` só com o número. Clique troca o ato.
- **Auto-advance opcional:** 6s por ato, pausa no hover. Sem flag de config, hardcoded.
- **Transição:** fade + slide-up leve do card inteiro (`opacity-0 translate-y-2 → opacity-100 translate-y-0` em 400ms). Sem libs novas — Tailwind `transition-all` + state.

### Implementação técnica

- **Novo componente:** `src/components/landing/SarahJourneySection.tsx`.
  - State: `const [step, setStep] = useState(0)` + `useEffect` com `setInterval` de 6s + cleanup + pause em `onMouseEnter`/`onMouseLeave`.
  - Props: `lang: 'pt' | 'en'` + `copy` com array de 5 atos.
  - Sub-componente `JourneyMock` reaproveita os 5 mini-mocks que já existem no `WeekTimelineSection.tsx` (Slack DM, 1:1 agenda, Tough Feedback, Performance Review, e adiciono um novo `CalibrationGrid` 3x3 simples).
- **Assets reaproveitados:**
  - `src/assets/landing-cinematic-office.jpg` (já existe — ato 1).
  - Para os outros 4 atos, gero novas fotos cinematográficas via `imagegen` na mesma pegada (noturno/golden hour, luz quente, silhuetas, sem rosto identificável) e salvo em `src/assets/landing/journey/`:
    - `journey-2-loft-bar.jpg` (1:1)
    - `journey-3-sunset-pier.jpg` (feedback)
    - `journey-4-office-golden.jpg` (review)
    - `journey-5-lake-dock.jpg` (calibração) - remover não temos calibração, a jorney 4 tem que ser a final (review)
- **Integração em `Landing.tsx`:**
  - Trocar `import { WeekTimelineSection }` por `import { SarahJourneySection }`.
  - Substituir o `<WeekTimelineSection ... />` por `<SarahJourneySection lang={lang} copy={t.journey} />`.
  - Substituir o bloco `weekDays/weekOverline/weekTitle/...` no dicionário PT/EN por um novo `journey` com `overline: "Como funciona"`, `title`, `subtitle`, `acts: [{tag, title, body, mock}]` (5 atos).
- **EN:** espelho equivalente ("Meet Ana. Her journey with Rhitmo.").

### Conteúdo PT (resumo)

```ts
journey: {
  overline: "Como funciona",
  title: "Conheça a Ana.\nA jornada dela com a Rhitmo.",
  subtitle: "Do primeiro dia à primeira avaliação formal, a Rhitmo trabalha em background.",
  acts: [
    { tag: "SEMANA 1",   label: "Onboarding", title: "Ana entra no time",                  body: "Antes do líder lembrar, a Rhitmo manda um check-in no Slack. O líder vê o gap antes da próxima 1:1.", mock: "slackDM" },
    { tag: "SEMANAL",    label: "1:1s",       title: "1:1s que se preparam sozinhas",     body: "Sem 'então... do que a gente fala?'. A Rhitmo monta a pauta a partir do trabalho real da semana, e Ana adiciona o que importa pra ela.",       mock: "oneOnOne" },
    { tag: "CONTÍNUO",   label: "Feedback",   title: "Feedback no calor do momento",      body: "A Rhitmo nota quando Ana fecha um projeto com alguém e pergunta direto: como ela mandou? Ana vê o feedback no mesmo dia, não seis meses depois.", mock: "peerFeedback" },
    { tag: "FIM DO TRI", label: "Review",     title: "Avaliações que nascem prontas",     body: "A Rhitmo escreve o draft da review da Ana a partir de evidência real. O líder revisa em vez de reconstruir o trimestre de memória.",          mock: "review" },
    { tag: "EMPRESA",    label: "Calibração", title: "Decisões justas e auditáveis",      body: "Na calibração, o comitê vê onde cada um cai na grade e consegue rastrear qualquer nota até a evidência que a sustenta.",                    mock: "calibration" },
  ],
}
```

### Guardrails

- Lora pra títulos, Inter pra corpo. Sem em-dashes.
- `max-w-5xl` no wrapper externo.
- Sem cores hardcoded fora dos neutros (`text-white`, `text-slate-*`, `bg-black/*` no overlay são OK pois são overlays sobre foto, não cor de marca).
- Fotos com `loading="lazy"` + `alt` descritivo por ato.
- Mobile: foto fica em cima (`aspect-[4/3]`), texto + mockup empilham embaixo dentro do mesmo card escuro. Sem absolute positioning.

### Fora do escopo

- Quadro comparativo (Planilhas / Qulture / Lattice / Rhitmo) — fica intocado.
- Hero e seção cinematográfica anterior — intocadas.
- Persona "Sarah" do Windmill: uso "Ana" pra manter PT-BR consistente com o resto da landing.
- Mocks já existentes no `WeekTimelineSection.tsx` viram componentes reutilizáveis dentro do novo arquivo (movo, deleto o arquivo antigo).