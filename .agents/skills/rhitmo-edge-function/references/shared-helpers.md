# Helpers em `supabase/functions/_shared/` (NÃO recriar)

Antes de escrever qualquer utilitário em uma edge function nova, confirme se já não existe aqui. Duplicação de lógica é o vetor #1 de drift entre web e Slack.

## Infra

| Arquivo | O que faz |
|---|---|
| `safeSupabase.ts` | `safeRpc / tryRpc / safeQuery / safeFunctionInvoke` — substitui `.catch()` direto em PostgrestBuilder. **Obrigatório.** |
| `logger.ts` | Logger estruturado (JSON line). Usar em vez de `console.log`. |
| `cronAuth.ts` | `assertCronSecret(req)` — valida `x-cron-secret` para jobs do `pg_cron`. |
| `emit.ts` | Emissão de eventos para tabela `events` (analytics + ativações). |
| `featureFlags.ts` | Flags por workspace. |
| `findUserByEmail.ts` | Lookup seguro em `auth.users` via service role. |

## AI / Rhitmo Soul

| Arquivo | O que faz |
|---|---|
| `aiGateway.ts` | Wrapper Lovable AI Gateway (`callAI`), token accounting, fallback de modelo. **Único caminho permitido para LLM.** |
| `aiPricing.ts` | Custo por chamada (tokens × tabela de preço). |
| `soul/loader.ts` | `composeSystemPrompt({ mode, channel, vars })`. Carrega `soul/*.md` (identidade + guardrails + modo + canal). **Único caminho permitido para system prompt.** |
| `soul/*.md` | Fonte única da alma da Rhitmo. Edição via skill `rhitmo-soul-editor`. |
| `rhy-voice.ts` | `wrapAsRhy(text)` — embrulha mensagens curtas (DMs, notificações) no tom da Rhy sem chamar LLM. |
| `rhitmo-constitution.ts` | Guardrails legados — verificar se já migrou pra `soul/` antes de usar. |
| `rhitmo-leader-coach.ts` | Receitas específicas pro modo coach. |

## Features

| Arquivo | O que faz |
|---|---|
| `briefGenerator.ts` | Geração do brief 1:1 (consumido pelo `slack-rhitmo-orchestrator`). |
| `quarterlyNudgeHelpers.ts` | Janelas trimestrais (aniversário de liderança). |
| `recallParticipants.ts` | Parsing de `speaker_timeline` do bot Recall.ai. |
| `notifications.ts` | DM Slack + email via pgmq + in-app — entrega multi-canal. |
| `slackCommands.ts` | Registry e payloads de slash commands (espelho de `mem://features/slack/command-ecosystem`). |

## Email

- `email-templates/` — React Email para auth hook (verificação, reset).
- `transactional-email-templates/` — React Email para notificações de produto.

## Quando criar algo novo em `_shared/`

Crie aí (não na função) se:
- 2+ edge functions vão usar a mesma lógica, OU
- A lógica representa uma decisão de domínio (cálculo de health score, parsing de payload externo, regra de RLS espelhada).

Não crie em `_shared/` se for específico de uma função (mantenha em `index.ts`).
