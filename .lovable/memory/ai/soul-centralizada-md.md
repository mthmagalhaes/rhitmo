---
name: Rhitmo Soul (alma centralizada em .md)
description: Fonte única da alma da Rhitmo em supabase/functions/_shared/soul/ (identity, guardrails, analysis-matrix, tone, drafting, citations, identity-protocol + modes/ + channels/web|slack); composeSystemPrompt(loader.ts) compõe o system prompt para web e Slack a partir dos mesmos .md
type: feature
---

# Rhitmo Soul

Toda mudança de comportamento da Rhitmo (identidade, guardrail, tom, modo, canal) começa por um `.md` em `supabase/functions/_shared/soul/`. Prompt inline em edge function = bug.

## Estrutura
- `00-identity.md`, `01-guardrails.md`, `02-analysis-matrix.md`, `03-tone-and-format.md`, `04-drafting.md`, `05-citations.md`, `06-identity-protocol.md`
- `modes/`: leader-member, leader-self, member-self, pulse-survey, one-on-one-prep, self-review
- `channels/`: web (Markdown rico, H3, blockquotes, pílulas `[doc:UUID]`), slack (mrkdwn `*negrito*`, `_itálico_`, sem H3, sem tabelas)
- `loader.ts` expõe `composeSystemPrompt({mode, channel, vars, appendices})` async. `MODE_BLOCKS` define ordem canônica.
- `loader_test.ts`: 7 testes garantem paridade web↔slack, interpolação de `{{var}}`, ausência de leak entre canais.

## Status (Sprint atual)
- ✅ Docs + loader + testes no ar.
- ⏭️ Próxima iteração: refatorar `chat-mentor/index.ts` (~250 linhas inline), `slack-bot/buildSystemPromptForIntent` (1-liners) e rotear `member general_chat` no Slack para `chat-mentor` modo `member_self`.
- `rhitmo-constitution.ts` e `rhitmo-leader-coach.ts` marcados como DEPRECATED — manter compat até migração completa.

## Como usar (futuro)
```ts
import { composeSystemPrompt } from "../_shared/soul/loader.ts";
const sys = await composeSystemPrompt({
  mode: "leader-member",
  channel: "web", // ou "slack"
  vars: { memberName, firstName, managerName, managerFirstName, memberRole },
  appendices: [contextLines, timeWindowBlock],
});
```
