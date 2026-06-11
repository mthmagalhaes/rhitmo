# Arquitetura da Alma

## Estrutura de pastas

```
supabase/functions/_shared/soul/
├── 00-identity.md           Quem é a Rhitmo, missão, CARÁTER, FRASE INTERNA
├── 01-guardrails.md         Anti-alucinação, rastreabilidade, segurança, anti-jailbreak
├── 02-analysis-matrix.md    Camada Fática + Comportamental + "Melancia"
├── 03-tone-and-format.md    Tom HR Executive + resposta proporcional ao input
├── 04-drafting.md           Gerador de rascunhos calibrado por Rhitmo Sync
├── 05-citations.md          Protocolo [doc:UUID] + janela temporal
├── 06-identity-protocol.md  Protagonista / filtro de ruído / apelidos
├── 07-memory.md             rhy_context_cache (sessionSummary, sessionCount, pendingActions)
├── 08-disc-calibration.md   Calibração por work_style_data DISC
├── modes/
│   ├── leader-member.md     Líder analisando liderado X
│   ├── leader-self.md       Coaching pessoal do líder (extends 07-memory)
│   ├── member-self.md       Liderado falando da própria carreira
│   ├── pulse-survey.md
│   ├── one-on-one-prep.md
│   ├── self-review.md
│   ├── monthly-recap.md     Rhitmo Mensal (extends 07+08)
│   └── quarterly-recap.md   Rhitmo Trimestral (extends 07+08)
├── channels/
│   ├── web.md               Markdown rico, H3 com emoji, blockquotes, [doc:UUID]
│   ├── slack.md             *negrito*, • bullets, sem H3, sem tabelas
│   └── whatsapp.md          *negrito* simples, brevidade máxima
├── loader.ts                composeSystemPrompt + MODE_BLOCKS + CHANNEL_BLOCK
├── docs.generated.ts        Bundle estático dos .md (AUTO-GENERATED)
├── regen-docs.ts            Script que regenera docs.generated.ts
├── regen-snapshots.ts       Script que regenera __snapshots__/
├── loader_test.ts           11 testes (paridade web↔slack, vars, snapshot drift)
└── __snapshots__/
    ├── leader-member.{web,slack}.txt
    └── member-self.{web,slack}.txt
```

## Ordem canônica de composição (MODE_BLOCKS)

Definida em `loader.ts`. Cada modo lista os blocos base que carrega + seu próprio `modes/X.md` + o `channels/X.md` no final. **Não mudar ordem sem regenerar snapshot** — diff fica ilegível.

Modos legados (`leader-member`, `member-self`, `pulse-survey`, `one-on-one-prep`, `self-review`) **não** carregam 07/08 — preservam snapshots existentes. Só `leader-self`, `monthly-recap`, `quarterly-recap` carregam memória/DISC.

## Vars de interpolação `{{var}}`

Substituídas em `interpolate()` do loader. Ausente = placeholder `{{var}}` permanece visível (debug intencional, não silenciar).

Comuns: `memberName`, `firstName`, `managerName`, `managerFirstName`, `memberRole`, `leaderName`, `leaderFirstName`, `directReportsList`, `leaderProfileSection`, `teamPatternsSummary`, `recentReflections`.

V2 (opcionais): `sessionSummary`, `sessionCount`, `pendingActions`, `monthlyRecaps`, `previousQuarterSummary`, `quarterLabel`, `monthlyRecapCount`, `nextQuarterDate`, `periodStart`, `periodEnd`, `periodLabel`, `evidenceCount`, `nextMonth`, `work_style_data`.

## Appendices

Texto dinâmico (RAG, evidências, contexto temporal) entra via `appendices: string[]` — concatenado ao final separado por `---`. Nunca colocar dado dinâmico dentro do `.md`.

## Consumers vivos

- **Web** `chat-mentor`: `leader_self` → loader leader-self/web; `member` → leader-member/web.
- **Slack DM** líder `general_chat` → leader-self/slack; liderado → member-self/slack.
- **Slack intents** (`pulse_survey`, `1v1_prep`, `self_review`, `general_chat`) → `buildSystemPromptForIntent` via loader.
