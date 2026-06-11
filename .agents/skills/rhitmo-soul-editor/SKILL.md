---
name: rhitmo-soul-editor
description: Edit the Rhitmo "soul" (identity, guardrails, tone, modes, channels) safely. Use when modifying any file under supabase/functions/_shared/soul/*.md, adding a new mode or channel, migrating an edge function with an inline prompt to composeSystemPrompt, or debugging prompt drift between web and Slack.
---

# Rhitmo Soul Editor

A alma da Rhitmo (identity, guardrails, tom, modos, canais) vive em `supabase/functions/_shared/soul/*.md`. Web (`chat-mentor`) e Slack (`slack-bot`) compõem o system prompt via `composeSystemPrompt({mode, channel, vars, appendices})` do `loader.ts`.

## Regra de ouro
**Prompt inline em edge function = bug.** Toda mudança de comportamento (identidade, guardrail, tom, modo, canal) começa por um `.md` em `supabase/functions/_shared/soul/`. Nunca cole texto de prompt direto em `index.ts`.

## Checklist obrigatório após editar QUALQUER `.md` da alma

```bash
# 1. Regenera o bundle (.md vira string embutida no docs.generated.ts)
deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-docs.ts

# 2. Regenera os snapshots dos prompts compilados
deno run --allow-read --allow-write supabase/functions/_shared/soul/regen-snapshots.ts

# 3. Revisa o diff de __snapshots__/*.txt (paridade web↔slack)
# 4. Roda os testes do loader
deno test --allow-read supabase/functions/_shared/soul/loader_test.ts
```

Commite os 3 juntos: `.md` editado + `docs.generated.ts` + `__snapshots__/*.txt`. Faltar qualquer um = drift em produção.

**Por quê:** runtime das edge functions publicadas **não expõe os `.md`** no filesystem; o loader lê de `SOUL_DOCS` (mapa estático). Editar `.md` sem rodar `regen-docs` = a alteração não vai pro ar.

## Por onde começar conforme a tarefa

| Tarefa | Leia primeiro |
|---|---|
| Entender a arquitetura (estrutura, ordem de blocos, vars) | `references/architecture.md` |
| Editar bloco existente, criar modo/canal, migrar edge function | `references/workflows.md` |
| Bug recorrente ou comportamento estranho em produção | `references/anti-patterns.md` |

## Edge functions ainda com prompt inline (a migrar)
`generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator`, `briefGenerator.ts`. `_shared/rhitmo-constitution.ts` está **DEPRECATED** — não importar em código novo.
