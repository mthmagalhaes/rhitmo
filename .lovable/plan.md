## Entregáveis

Três frentes paralelas, todas como **artefatos** (não tocam código do app).

---

### 1. Plano Técnico — atualizar 2 arquivos

**a) `rhitmo-technical-report-april-2026.md`** → renomear conceito p/ "May 2026" no conteúdo, sem mover arquivo. Adicionar seções cobrindo Sprints 8 → 17 que ainda não estão lá:

- **Sprint 8** — Citations Auditable Trail + Context Feed Universal (`/lider/contexto`, RPC `get_team_timeline`)
- **Sprint 9** — Pulse Surveys (UI trigger + `pulse_responses` → `ctx_evidence`)
- **Sprint 10** — 360° Reviews (Self / Peer / Upwards wizards + `review_peers`)
- **Sprint 11** — Slack Conversational State Machine + Proactive DMs Orchestrator (cron `*/30`)
- **Sprint 12** — Master-Detail pages (`/lider/1on1s`, `/diario`, `/objetivos`)
- **Sprint 14** — Home V3 Windmill + Network Signals & Pulse + Brief network block
- **Sprint 15** — Peer Feedback Loop (`request-peer-feedback`)
- **Sprint 17** — Quarterly Anniversary Nudge + Formal Review RAG completo
- Architecture refreshes: Safe Supabase Wrappers, Edge Function Ownership Pattern, Slack DM RAG Temporal Windows, Ambient Mode Settings
- Atualizar matriz de papéis (5: Super Admin / Owner / HR Admin / Leader / Liderado)
- Atualizar economic model (Gemini 2.5 Flash em L3)

**b) `.lovable/plan.md`** → reescrever com:
- Status atual (Sprint 17 done, próximo: Sprint 18)
- Backlog priorizado curto (3-5 itens)
- Tech debt visível
- Sem detalhes de implementação fechada (isso vive no report)

---

### 2. Pitch Deck Seed Brasileiro — `pitch-deck-seed.pptx` (EN)

**Audiência:** fundos seed BR/LatAm (Canary, Maya, Norte, Astella, Domo) + anjos internacionais.
**Tom:** confident, founder-led, problem-obsessed. Placeholders `[INSERT METRIC]` em todos os números financeiros / tração quantitativa.

**Estrutura — 14 slides:**

```
01  Cover           Rhitmo — AI Leadership Partner / Logo + tagline
02  The Problem     Managers drown in 1:1s, lose context, write reviews from memory
03  Why Now         AI meeting bots + LLM context windows + post-COVID 1:1 culture
04  Solution        Service-as-Software: not a tool, an outcome (reviews done for you)
05  Product         3 pillars — Context Graph / Mentor (RAG) / Reviews & 1:1s
06  Demo Visuals    Screenshots: /lider/contexto, Mentor chat, Formal Review, Slack DM
07  Wedge           Slack-native + Magic Paste (Tactiq/Fireflies) — zero behavior change
08  Moat            Proprietary Context Graph (multi-source: meetings + Slack + pulses + 360°)
09  Market          TAM/SAM/SOM — Brazil mid-market managers [INSERT NUMBERS]
10  Traction        [INSERT] workspaces, [INSERT] reviews generated, [INSERT] MRR
11  Business Model  Pulse / Pro / Business tiers + per-seat economics + Gemini margin
12  Roadmap         Q3: ONA full / Q4: Multi-language / 2027: Enterprise SSO + APIs
13  Team            Founder + advisors [INSERT BIOS]
14  The Ask         Raising US$[INSERT] Seed — use of funds (60% eng / 25% GTM / 15% ops)
```

**Design — palette "Charcoal Minimal" + accent Rhitmo cream/blue:**
- Bg slides 1+14: dark charcoal `#1a1a1a` / cream text `#F5EFE6`
- Bg conteúdo: cream `#F5EFE6` / charcoal text
- Accent: Rhitmo blue `#3B82F6`
- Headers: Georgia bold 40pt / Body: Calibri 16pt
- Visual motif: thin horizontal RhythmWave SVG no rodapé de cada slide
- Stats em hero size (72pt) com label pequeno embaixo
- Slide 06 (Demo): half-bleed mockup à direita + bullets à esquerda

---

### 3. Onboarding Líder Executivo — `onboarding-lider-rhitmo.pptx` (PT-BR)

**Audiência:** novo líder após signup self-service. **Não é tour de produto** — é "por que existo, o que ganho, como começo em 5 min".
**Tom:** Early Adopter, direto, sem em-dashes (memória LP). Lora headers / Inter body.

**Estrutura — 10 slides:**

```
01  Bem-vindo            Olá, [Nome]. Você acabou de ganhar um chefe de gabinete
02  O Problema Real      Quanto tempo você perde preparando 1:1, lembrando do que disse, escrevendo review?
03  A Promessa           Rhitmo transforma cada conversa em contexto. Reviews escritas com evidência.
04  Os 3 Pilares         Contexto (timeline) + Mentor (chat com IA) + Reviews (geradas, não escritas)
05  Como Funciona        Slack + Google Meet + Magic Paste → Context Graph → Tudo conectado
06  Privacidade          Suas notas privadas são suas. Compartilhar é ato explícito.
07  Comece em 5 min      1) Conecte Slack  2) Convide 1 liderado  3) Cole sua próxima 1:1
08  Quick Wins primeira semana   Brief automático antes da 1:1 / Pauta sugerida / Pulse semanal
09  Suporte e Ritmo      Onboarding Tour, Help Center, comunidade
10  Vamos começar        CTA: "Ir para /lider/inicio" + QR code
```

**Design — palette "Warm Terracotta" suavizada para creme Rhitmo:**
- Cream bg `#F5EFE6` em todo deck
- Accent terracotta `#B85042` para destaques + Rhitmo blue `#3B82F6` para CTAs
- Lora bold 36pt headers / Inter 15pt body
- Bento Grid em slides 04 e 08 (3 cards arredondados, soft shadow)
- Ícones Lucide-style em círculos cream/blue
- Slide 01 + 10: dark charcoal pra contraste sandwich

---

### Stack de execução

- **Skill:** `pptx` (pptxgenjs) + skill `docx` não usada
- **Geração:** Node script com base64 embed de qualquer asset
- **QA mandatório:** LibreOffice → PDF → `pdftoppm` → inspeção visual de cada slide → fix loop até 0 issues
- **Output:**
  - `/mnt/documents/rhitmo-pitch-deck-seed.pptx`
  - `/mnt/documents/rhitmo-onboarding-lider.pptx`
  - `rhitmo-technical-report-april-2026.md` (atualizado in-place)
  - `.lovable/plan.md` (atualizado in-place)

### Detalhes técnicos

- Sem alteração de schema, RLS, edge functions ou código React
- Sem novas memórias (decks são artefatos one-off)
- Numbers em USD para pitch (audiência mista BR/internacional)
- Pitch fica EN; placeholders marcados `[INSERT X]` em amarelo visível pra revisão
