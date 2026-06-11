## Nova seção: "Uma semana sem Rhitmo vs. uma semana com Rhitmo"

Substitui o bloco atual de bullets Sem ✗ / Com ✓ por uma **timeline viva** — a mesma agenda de um líder, em dois mundos. A esquerda é cinza, manual, fragmentada. A direita é a mesma semana com o produto fazendo o trabalho pesado, ancorada em screenshots reais.

### Estrutura visual

```
┌──────────────────────────────────────────────────────┐
│  OVERLINE  ·  Uma semana na sua liderança            │
│  H2: "Mesma agenda. Trabalho diferente."             │
│  Sub: 5 dias, lado a lado. Onde antes você gastava   │
│       horas, agora a Rhitmo entrega pronto.          │
└──────────────────────────────────────────────────────┘

┌─────────────── SEM RHITMO ──┬── COM RHITMO ───────────┐
│ SEG · 09:00                 │ SEG · 09:00              │
│ "Caçar prints no Slack pra  │ [screenshot: chip Slack  │
│  lembrar o que rolou na     │  no Diário com rollup    │
│  sprint passada"            │  semanal por liderado]   │
│  ⏱ 45min · manual           │  ⏱ 0min · automático     │
├─────────────────────────────┼──────────────────────────┤
│ TER · 14:00 · 1:1 com Ana   │ TER · 14:00 · 1:1 c/ Ana │
│ "Anotar no Notion, depois   │ [screenshot: nota 1:1    │
│  esquecer onde salvei"      │  no Diário com tag 1:1   │
│  ⏱ 20min + perda            │  e action items]         │
│                             │  ⏱ Recall transcreve     │
├─────────────────────────────┼──────────────────────────┤
│ QUA · feedback difícil      │ QUA · feedback difícil   │
│ "Reler tudo pra ter certeza │ [screenshot: chip Tough  │
│  do contexto"               │  Feedback + evidências]  │
├─────────────────────────────┼──────────────────────────┤
│ QUI · 16:00 · check-in time │ QUI · 16:00              │
│ "Mandar form, esperar 3 dias│ [screenshot: Pulse card  │
│  pra ler 4 respostas"       │  com sinais da rede]     │
├─────────────────────────────┼──────────────────────────┤
│ SEX · 17:00 · review mensal │ SEX · 17:00              │
│ "Abrir doc em branco. 4h."  │ [screenshot: tabela      │
│  ⏱ 4h por liderado          │  /lider/avaliacoes c/    │
│                             │  Últ. Mensal preenchido] │
│                             │  ⏱ Draft pronto          │
└─────────────────────────────┴──────────────────────────┘

         Faixa final (rodapé da seção):
   "Mesmas 5 horas da sua semana. Devolvidas."
```

### Decisões de design

- **Layout:** grid de 2 colunas (`grid md:grid-cols-2`), 5 linhas alinhadas horizontalmente por dia. Mobile vira accordion (um dia por vez, esquerda em cima, direita embaixo, separador "vs.").
- **Coluna esquerda ("Sem Rhitmo"):** fundo `bg-slate-50`, texto `text-slate-500`, ícones de relógio/alerta neutros, sem screenshots — só texto cru e tempo perdido em badge `⏱ Xh manual`.
- **Coluna direita ("Com Rhitmo"):** fundo `bg-white` com a borda iridescente já existente (`iridescent-surface`) apenas no card-mãe direito; cada linha tem um screenshot real do produto (PNG estático) + 1 frase curta + badge `⏱ 0min` ou `pronto`.
- **Tipografia:** dia em `text-[10px] uppercase tracking-[0.3em]` (mesmo overline da landing). Frases em Inter regular. H2 em Lora `font-serif text-5xl md:text-6xl tracking-tight`.
- **Linha do tempo central (desktop):** linha vertical fina de 1px no meio do grid com bolinhas marcando cada dia, criando sensação de "trilho do tempo".
- **Faixa final:** card horizontal largo, fundo claro, número grande "+5h" em Lora à esquerda, frase "Mesmas 5 horas da sua semana. Devolvidas." à direita.

### Screenshots reais a capturar (5 imagens estáticas)

Captura via browser do próprio dev/preview, com workspace de demo (não com matheus.magalhaes@fstr.co que está vazio). Crop apertado no card que importa, salvar como `.png` em `src/assets/landing/week/`:

1. `week-mon-slack-rollup.png` — card de Slack rollup no Diário (`/lider/diario`, chip Slack ativo)
2. `week-tue-oneonone-note.png` — nota 1:1 com action items (`/lider/diario`, chip 1:1)
3. `week-wed-tough-feedback.png` — entrada Tough Feedback com evidências (`/lider/diario`, chip Tough Feedback)
4. `week-thu-pulse.png` — card Pulse / Team Pulse Bento (`/lider/inicio` ou `/lider/contexto`)
5. `week-fri-reviews-table.png` — tabela `/lider/avaliacoes` com linha preenchida

Se o workspace logado não tiver dados o suficiente, eu uso um workspace seed/demo ou monto mocks visuais fiéis às telas (mesmos componentes, dados fake). Vou priorizar capturas reais.

### Conteúdo (PT + EN)

**PT — adicionar ao dicionário `pt` em `Landing.tsx`:**
```ts
weekOverline: "Uma semana na sua liderança",
weekTitle: "Mesma agenda. Trabalho diferente.",
weekSubtitle: "Cinco dias, lado a lado. Onde antes você gastava horas, a Rhitmo entrega pronto.",
weekColLeft: "Sem Rhitmo",
weekColRight: "Com Rhitmo",
weekDays: [
  { day: "SEG", time: "09:00", left: "Caçar prints no Slack pra lembrar o que rolou na sprint", leftBadge: "45min manual", right: "Rollup semanal de Slack já anotado por liderado", rightBadge: "automático", img: "slack" },
  { day: "TER", time: "14:00", left: "Anotar 1:1 no Notion e depois perder onde salvei", leftBadge: "20min + perda", right: "1:1 transcrita, com action items e tags prontas", rightBadge: "Recall + IA", img: "oneonone" },
  { day: "QUA", time: "11:00", left: "Reler tudo pra ter certeza do contexto antes de um feedback difícil", leftBadge: "1h relendo", right: "Feedback ancorado em evidências reais do trimestre", rightBadge: "evidência viva", img: "tough" },
  { day: "QUI", time: "16:00", left: "Mandar form de check-in e esperar 3 dias por 4 respostas", leftBadge: "3 dias de espera", right: "Pulse com sinais da rede em tempo real", rightBadge: "tempo real", img: "pulse" },
  { day: "SEX", time: "17:00", left: "Abrir doc em branco pra escrever review do zero", leftBadge: "4h por liderado", right: "Review mensal com draft pronto e citações auditáveis", rightBadge: "pronto", img: "reviews" },
],
weekFooterNumber: "+5h",
weekFooterLabel: "Mesmas 5 horas da sua semana. Devolvidas.",
```

**EN** — espelho equivalente.

### Implementação técnica

- **Novo componente:** `src/components/landing/WeekTimelineSection.tsx`.
- **Assets:** pasta `src/assets/landing/week/` com 5 PNGs (capturados via browser tool em build mode).
- **Integração em `Landing.tsx`:**
  - Remover bloco `BEFORE / AFTER` (linhas 1153-1206).
  - Remover do dicionário `pt` e `en` as chaves `beforeAfterOverline`, `beforeAfterTitle`, `withoutRhitmo`, `withRhitmo`, `beforeItems`, `afterItems`.
  - Adicionar as novas chaves PT/EN listadas acima.
  - Importar e renderizar `<WeekTimelineSection lang={lang} t={t} />` no mesmo lugar.
- **Quadro comparativo (Recurso / Planilhas / Plataformas / Rhitmo):** mantém como está nesta sprint. Não vamos mexer agora — a nova seção já carrega a tese visual; o quadro fica como prova racional logo abaixo. Se quiser fundir os dois, faço numa rodada separada.

### Guardrails

- Sem em-dashes (memória de tom).
- Sem cores hardcoded fora das classes neutras do Tailwind já usadas na landing (`text-slate-*`, `bg-white`, `bg-slate-50`).
- `max-w-5xl` mantido no wrapper, conforme padrão da landing.
- Screenshots como `<img loading="lazy">` com `alt` descritivo por linha.
- Mobile: cada dia vira um card vertical com label "Antes" / "Agora" e screenshot menor. Nada de tabela horizontal apertada.

### O que NÃO está no escopo

- Não toca o quadro comparativo (Planilhas / Qulture / Lattice / Rhitmo).
- Não toca o hero nem a seção cinematográfica criada anteriormente.
- Não cria animações scroll-linked complexas (pode entrar numa rodada visual depois — aqui priorizamos clareza e screenshots reais).