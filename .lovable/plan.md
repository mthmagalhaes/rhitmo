## Diagnóstico do retrocesso

Hoje a "alma" da Rhitmo está fragmentada em 4 lugares com pesos muito diferentes, e o Slack acaba ficando órfão da maior parte dela:

```text
                 ┌─ Web Mentor Chat (chat-mentor) ─────────────────────────┐
                 │  • RHITMO_IDENTITY (21 linhas)                          │
SOURCE-OF-TRUTH  │  + GUARDRAILS_PROMPT                                    │
ATUAL            │  + ANALYSIS_RULES                                       │
                 │  + buildLeaderCoachSystemPrompt (modo coaching pessoal) │
                 │  + ~250 linhas de prompt INLINE em chat-mentor/index.ts │
                 │    (matriz integrada, drafting, tom, formatação,        │
                 │     anti-injection, citações, janela temporal…)         │
                 └─────────────────────────────────────────────────────────┘

                 ┌─ Slack DM (slack-bot) ──────────────────────────────────┐
                 │  • Líder em general_chat → callLeaderMentorFromDM       │
                 │       → herda TUDO do chat-mentor ✅                     │
                 │  • Liderado / pulse / 1v1_prep / self_review            │
                 │       → buildSystemPromptForIntent()                    │
                 │       → 1 LINHA de prompt, sem RAG, sem guard-rails ❌   │
                 │  • /nota, /kudos, /brief, /mentor, /meu-rhitmo          │
                 │       → cada um com prompt inline próprio               │
                 └─────────────────────────────────────────────────────────┘
```

Resultados práticos do que você está sentindo:
- Liderado falando com a Rhitmo no Slack recebe um modelo "burro": sem identidade, sem matriz integrada, sem citações, sem anti-alucinação.
- Pulse / 1:1 prep / self-review no Slack rodam com prompts de 1 linha — perdem tom, perdem formatação, perdem guard-rails.
- Qualquer mudança de tom/regra hoje exige editar prompt inline em `chat-mentor/index.ts` (~250 linhas), `rhitmo-constitution.ts`, `rhitmo-leader-coach.ts` e múltiplos pontos do `slack-bot/index.ts`. Drift é inevitável.
- Não existe um documento auditável que descreva "como a Rhitmo deve se comportar" — só código.

## Objetivo

Tratar a constituição da Rhitmo como **produto versionado em Markdown**, e fazer o código ler dela. Web e Slack passam a compor o system prompt a partir dos mesmos blocos `.md`.

## Estrutura proposta de docs

Criar `supabase/functions/_shared/soul/` com Markdown puro (sem código), versionados no repo:

```text
supabase/functions/_shared/soul/
  00-identity.md            # Quem é a Rhitmo, missão, diferencial, core user
  01-guardrails.md          # Regras de ouro (anti-alucinação, rastreabilidade,
                            #   segurança, anti-jailbreak, anti-prompt-injection)
  02-analysis-matrix.md     # Camada Fática + Comportamental + Síntese (Melancia)
  03-tone-and-format.md     # Tom HR Executive + diretrizes de formatação +
                            #   "resposta proporcional ao input" + Síntese Honesta
  04-drafting.md            # Gerador de rascunhos (calibrado por Rhitmo Sync)
  05-citations.md           # Protocolo [doc:UUID] e janela temporal
  06-identity-protocol.md   # Protagonista / filtro de ruído / apelidos
  modes/
    leader-member.md        # Modo "líder analisando liderado X" (web + Slack)
    leader-self.md          # Modo coaching pessoal do líder
    member-self.md          # Modo "Meu Rhitmo" (liderado falando da própria carreira)
    pulse-survey.md         # Pulse conversacional
    one-on-one-prep.md      # Preparação de 1:1
    self-review.md          # Wizard de autoavaliação
  channels/
    web.md                  # Markdown rico, headings H3, blockquotes, pílulas
    slack.md                # *negrito*, _itálico_, • bullets, sem H3, sem tabelas
```

Cada arquivo é um bloco coeso e curto (≤ 80 linhas), com frontmatter mínimo:
```text
---
id: guardrails
applies_to: [web, slack]
version: 1
---
```

## Loader compartilhado

Criar `supabase/functions/_shared/soul/loader.ts`:

- `loadSoul(modules: string[], channel: 'web' | 'slack'): string`
  Lê os `.md` no boot do edge (cache em memória), concatena na ordem canônica, injeta o bloco `channels/{channel}.md` ao final, e devolve o system prompt.
- `composeSystemPrompt({ mode, channel, vars })` — recebe `mode` (`leader-member`, `leader-self`, `member-self`, `pulse-survey`, etc.), aplica substituições simples `{{memberName}}`, `{{firstName}}`, `{{leaderSyncData}}`, etc., e devolve string final.

Os `.md` ficam **dentro do bundle** do edge function (Deno lê via `import.meta.url` + `Deno.readTextFile`), então deploy continua atômico — nada externo a buscar em runtime.

## Refatoração dos consumidores

1. `supabase/functions/chat-mentor/index.ts`
   - Substituir os ~250 linhas inline por `composeSystemPrompt({ mode: 'leader-member' | 'leader-self', channel: payload.channel ?? 'web', vars })`.
   - `RHITMO_IDENTITY`, `GUARDRAILS_PROMPT`, `ANALYSIS_RULES` em `rhitmo-constitution.ts` viram re-exports do loader (compat) e depois deprecam.
   - `rhitmo-leader-coach.ts` vira um wrapper fino sobre `composeSystemPrompt({ mode: 'leader-self' })`.

2. `supabase/functions/slack-bot/index.ts`
   - `buildSystemPromptForIntent(intent)` passa a chamar `composeSystemPrompt({ mode: intentToMode(intent), channel: 'slack', vars })`.
   - **Roteamento ampliado**: hoje só `leader + general_chat` cai em `callLeaderMentorFromDM`. Novo critério:
     - `leader + general_chat` → `chat-mentor` (leader_self) — já funciona.
     - `member + general_chat` → nova rota `chat-mentor` modo `member_self` (RAG do próprio histórico do liderado, igual ao que /meu-rhitmo já tem).
     - `pulse_survey` / `1v1_prep` / `self_review` → continua local no slack-bot, mas com system prompt vindo do loader (mesma alma, sem RAG pesado).
   - `/nota`, `/kudos`, `/brief`, `/mentor`, `/meu-rhitmo` deixam de ter prompt hardcoded e passam a montar via loader (modos dedicados em `soul/modes/`).

3. `src/lib/rhyVoice.ts` (frontend)
   - Continua com microcopy de UI (botões, placeholders), mas referencia `03-tone-and-format.md` como fonte na descrição do arquivo, para que mudanças de tom em UI também olhem para o mesmo doc.

## Garantias contra drift

- **Teste único de paridade**: `supabase/functions/_shared/soul/loader_test.ts` valida que para cada `mode`, gerar com `channel: web` e `channel: slack` produz strings que contêm os mesmos `id`s de blocos (mesma alma, só formatação muda). CI quebra se alguém esquecer um bloco em um canal.
- **Snapshot dos prompts finais**: salvar em `_test/__snapshots__/` os prompts compostos. Qualquer mudança em `.md` exige aprovar o snapshot — vira revisão de produto, não de código.
- **Regra de ouro nova no `mem://core`**: "Toda mudança de comportamento da Rhitmo (alma, guard-rail, tom, modo) começa em `_shared/soul/*.md`. Prompt inline em edge function = bug."

## O que NÃO muda agora

- RAG / busca semântica / `embed-context-evidence` / janela temporal — segue como está, só passa a ser instruído pelo `05-citations.md`.
- Slack manifest, comandos, fluxo de OAuth, AI Assistant container — intactos.
- Modelo (Gemini 2.5 Flash) e gateway — intactos.
- Persistência de conversas (`slack_conversations`, threads web) — intacta.

## Entregáveis em ordem

1. Criar a árvore `_shared/soul/` com os 9 docs base + 6 modos + 2 canais, extraindo o conteúdo do que já existe hoje (sem reescrever a alma — só consolidar).
2. Loader + testes de paridade web↔slack.
3. Refatorar `chat-mentor` para consumir o loader (sem mudar comportamento web — só trocar a fonte).
4. Refatorar `slack-bot` para usar loader em todos os modos e rotear `member general_chat` para `chat-mentor` (modo `member_self`).
5. Atualizar memórias (`mem://ai/constituicao-rhitmo-centralizada` e core) apontando que `_shared/soul/` é a fonte única.
6. QA manual: mesmo prompt do líder no web e no Slack DM deve produzir a mesma estrutura de resposta (formatação adaptada ao canal).

Depois disso, qualquer ajuste fino de soul vira PR de `.md` — auditável, versionado, sem caçar prompt em 4 arquivos.
