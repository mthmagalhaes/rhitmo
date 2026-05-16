---
name: Rhitmo Soul (alma centralizada em .md)
description: Fonte única da alma da Rhitmo em supabase/functions/_shared/soul/ (v2 — identity com CARÁTER, guardrails, analysis-matrix, tone, drafting, citations, identity-protocol, 07-memory, 08-disc-calibration + modes/ incl. monthly-recap/quarterly-recap + channels/web|slack|whatsapp); composeSystemPrompt(loader.ts) compõe system prompt para web, Slack e WhatsApp a partir dos mesmos .md; chat-mentor e slack-bot consomem o loader; 11 testes + 4 snapshots travam drift; docs.generated.ts embute todos os .md no bundle
type: feature
---

# Rhitmo Soul (v2)

Toda mudança de comportamento da Rhitmo (identidade, guardrail, tom, modo, canal) começa por um `.md` em `supabase/functions/_shared/soul/`. Prompt inline em edge function = bug.

## Estrutura
- Base: `00-identity` (v2: + CARÁTER, O QUE NÃO É, FRASE INTERNA), `01-guardrails`, `02-analysis-matrix`, `03-tone-and-format`, `04-drafting`, `05-citations`, `06-identity-protocol`, `07-memory` (rhy_context_cache + sessionCount), `08-disc-calibration` (work_style_data D/I/S/C).
- `modes/`: leader-member, leader-self (v2 — extends memory, +PERGUNTAS PODEROSAS, +sessionSummary/pendingActions), member-self, pulse-survey, one-on-one-prep, self-review, **monthly-recap** (3 blocos), **quarterly-recap** (6 blocos).
- `channels/`: web, slack, **whatsapp**.
- `loader.ts` expõe `composeSystemPrompt({mode, channel, vars, appendices})`. `MODE_BLOCKS` define ordem canônica.

## Carregamento por modo (07/08 só onde extends memory/disc)
- `leader-member`, `member-self`, `pulse-survey`, `one-on-one-prep`, `self-review` → **inalterados** (preservam snapshots).
- `leader-self` → +07-memory.
- `monthly-recap` / `quarterly-recap` → identity+guardrails+analysis+tone+citations+07+08+mode.

## Variáveis novas (todas opcionais — `Record<string,string|undefined|null>`)
sessionSummary, sessionCount, pendingActions, monthlyRecaps, previousQuarterSummary, quarterLabel, monthlyRecapCount, nextQuarterDate, periodStart, periodEnd, periodLabel, evidenceCount, nextMonth, work_style_data. Chamadas existentes sem essas vars continuam funcionando — placeholder fica visível para debug.

## Testes
`loader_test.ts`: 11 testes (paridade web↔slack, vars, snapshot drift). Snapshots em `__snapshots__/leader-member.{web,slack}.txt` e `member-self.{web,slack}.txt` — regenerados após v2 do 00-identity (só adições).

## Caminhos vivos
- Web `chat-mentor` `leader_self` → loader leader-self/web. `member` → leader-member/web.
- Slack DM líder `general_chat` → leader-self/slack. Liderado → member-self/slack.
- Slack intents (pulse_survey, 1v1_prep, self_review, general_chat) → `buildSystemPromptForIntent` via loader.

## Bundle nas edge functions publicadas
Runtime das edge functions **não expõe os `.md` no filesystem** do módulo. Loader lê de `docs.generated.ts` (mapa estático `SOUL_DOCS`) embutido no bundle. Após editar qualquer `.md` da alma:
```
deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-docs.ts
deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-snapshots.ts
```

## Compat / pendências
- `_shared/rhitmo-constitution.ts` DEPRECATED.
- A migrar: `generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator`, `briefGenerator.ts`.
- Modos novos (monthly-recap, quarterly-recap) e canal whatsapp ainda sem consumers — prontos para serem usados pelas próximas sprints (Rhitmo Mensal/Trimestral + canal WA).
