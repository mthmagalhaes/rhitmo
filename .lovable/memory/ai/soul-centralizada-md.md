---
name: Rhitmo Soul (alma centralizada em .md)
description: Fonte única da alma da Rhitmo em supabase/functions/_shared/soul/ (identity, guardrails, analysis-matrix, tone, drafting, citations, identity-protocol + modes/ + channels/web|slack); composeSystemPrompt(loader.ts) compõe o system prompt para web e Slack a partir dos mesmos .md; chat-mentor (leader_self|member|member_self) e slack-bot (intents + DM member) já consomem o loader; 11 testes + 4 snapshots travam drift
type: feature
---

# Rhitmo Soul

Toda mudança de comportamento da Rhitmo (identidade, guardrail, tom, modo, canal) começa por um `.md` em `supabase/functions/_shared/soul/`. Prompt inline em edge function = bug.

## Estrutura
- `00-identity.md`, `01-guardrails.md`, `02-analysis-matrix.md`, `03-tone-and-format.md`, `04-drafting.md`, `05-citations.md`, `06-identity-protocol.md`
- `modes/`: leader-member, leader-self, member-self, pulse-survey, one-on-one-prep, self-review
- `channels/`: web (Markdown rico, H3, blockquotes, pílulas `[doc:UUID]`), slack (mrkdwn `*negrito*`, `_itálico_`, sem H3, sem tabelas)
- `loader.ts` expõe `composeSystemPrompt({mode, channel, vars, appendices})` async. `MODE_BLOCKS` define ordem canônica.
- `loader_test.ts`: 11 testes (paridade web↔slack, interpolação `{{var}}`, vars ausentes mantém placeholder, ausência de leak entre canais, snapshot drift detection).
- `__snapshots__/*.txt`: snapshots byte-a-byte de `leader-member.{web,slack}` e `member-self.{web,slack}`. Mudança em `.md` exige rodar `regen-snapshots.ts` e revisar diff.

## Caminhos vivos (todos consomem o loader)
- **Web `chat-mentor` mode `leader_self`** → `composeSystemPrompt({mode:'leader-self', channel:'web'})` via `rhitmo-leader-coach.ts`.
- **Web `chat-mentor` mode `member`** → `composeSystemPrompt({mode:'leader-member', channel:'web'})`.
- **Slack DM líder `general_chat`** → `callLeaderMentorFromDM` → `chat-mentor` `leader_self` `channel:'slack'`.
- **Slack DM liderado `general_chat`** → `callMemberMentorFromDM` → `chat-mentor` `member_self` `channel:'slack'` (RAG só do próprio histórico, nunca sugere mostrar pro líder).
- **Slack intents** (`pulse_survey`, `1v1_prep`, `self_review`, fallback `general_chat`) → `buildSystemPromptForIntent` async via loader.

## Compat / pendências
- `_shared/rhitmo-constitution.ts` (`RHITMO_IDENTITY`, `GUARDRAILS_PROMPT`, `ANALYSIS_RULES`) — DEPRECATED, mantido só p/ edge functions ainda não migradas.
- A migrar em sprint futura (inventário): `generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator`, `briefGenerator.ts`.
- TODO: mirror Slack→web para member (hoje só leader). Schema `chat_threads.type` precisa aceitar `meu-rhitmo`.

## Como usar
```ts
import { composeSystemPrompt } from "../_shared/soul/loader.ts";
const sys = await composeSystemPrompt({
  mode: "leader-member",
  channel: "web", // ou "slack"
  vars: { memberName, firstName, managerName, managerFirstName, memberRole },
  appendices: [contextLines, timeWindowBlock],
});
```

## Regenerar snapshots
```
deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-snapshots.ts
```
