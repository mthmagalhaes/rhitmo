## Objetivo

Fechar a sprint da alma centralizada agora que `chat-mentor` (modos `leader_self`, `member`, `member_self`) e `slack-bot` (`buildSystemPromptForIntent` async + `callMemberMentorFromDM`) já passaram a usar `composeSystemPrompt`. Falta blindar contra drift e validar que web e Slack respondem com a mesma alma.

## Entregáveis

### 1. Testes de paridade ampliados (`_shared/soul/loader_test.ts`)

Adicionar 3 casos novos aos 7 já existentes:

- `member-self` + `channel: 'slack'` → contém bloco `mode-member-self` e `channel-slack`, NÃO contém `channel-web`.
- `leader-member` + `channel: 'slack'` → herda `04-drafting.md`, `05-citations.md`, `06-identity-protocol.md` e formatação Slack (sem `###`).
- Interpolação: `{{memberName}}`, `{{managerName}}`, `{{leaderFirstName}}` substituídos corretamente; vars ausentes mantêm `{{var}}` (debug visível).

### 2. Snapshots dos prompts compilados

Criar `supabase/functions/_shared/soul/__snapshots__/` com 4 arquivos `.txt`:

- `leader-member.web.txt`
- `leader-member.slack.txt`
- `member-self.web.txt`
- `member-self.slack.txt`

Gerados com vars fixas (`memberName=Gabi`, `managerName=Matheus` etc.) e SEM appendices. Teste novo lê o snapshot e compara byte a byte com a saída atual de `composeSystemPrompt`. Mudança em `.md` exige regenerar snapshot conscientemente (script `regen-snapshots.ts`).

### 3. QA manual nos 5 cenários

Rodar via `supabase--curl_edge_functions` + inspeção visual no preview:

1. **Web Mentor — líder analisando liderado**: H3 com emoji, Síntese Honesta, `[doc:UUID]` clicáveis, janela temporal aplicada.
2. **Web Mentor — coaching pessoal**: tom de provocação, sem citar liderado específico, redireciona se perguntarem sobre alguém.
3. **Slack DM líder ("como vai a Gabi este mês?")**: mrkdwn (`*negrito*`, `_itálico_`), sem `###`, sem tabelas, com janela temporal.
4. **Slack DM liderado ("o que vc acha de eu pedir aumento?")**: roteia para `chat-mentor` modo `member_self`, tom acolhedor, RAG do próprio histórico, NÃO sugere mostrar pro líder.
5. **Slack `pulse_survey` / `1v1_prep` / `self_review`**: herda identidade + guard-rails do soul (sai do prompt 1-linha).

Documentar resultados num bloco no fim do `plan.md` (PASS/FAIL + observações por cenário).

### 4. Limpeza de código deprecated

Após QA verde:

- `_shared/rhitmo-constitution.ts`: marcar `RHITMO_IDENTITY`, `GUARDRAILS_PROMPT`, `ANALYSIS_RULES` com JSDoc `@deprecated — use composeSystemPrompt({mode}) from _shared/soul/loader.ts`. Não remover ainda (compat com edge functions não migradas).
- `_shared/rhitmo-leader-coach.ts`: confirmar que é só wrapper do loader; adicionar comentário no topo apontando para os `.md`.
- Grep por outros usos inline (`generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator`) e listar candidatos a migrar em sprint futura — NÃO migrar nesta sprint.

### 5. Atualizar memória

`mem://ai/soul-centralizada-md`:
- Marcar Sprint atual como ✅ refatoração concluída.
- Listar 3 caminhos vivos: web `leader-member`, web/slack `leader-self`, slack/web `member-self` via chat-mentor.
- Adicionar 10 testes de paridade + 4 snapshots.

`mem://index.md`: atualizar entrada do soul com testes/snapshots e remover o ⏭️ "próxima iteração".

## Ordem de execução

1. Estender `loader_test.ts` (3 casos novos).
2. Criar `__snapshots__/` + `regen-snapshots.ts` + teste de snapshot.
3. Rodar `supabase--test_edge_functions` para validar 10 testes.
4. QA manual dos 5 cenários (curl + Slack DM real se possível).
5. JSDoc deprecated nos arquivos de compat.
6. Atualizar `mem://ai/soul-centralizada-md` e `mem://index.md`.

## O que NÃO muda nesta sprint

- Migração de `generate-brief`, `generate-formal-review`, `meu-rhitmo`, `self-reflection`, `slack-rhitmo-orchestrator` para o loader (fica para sprint seguinte; só inventário).
- Mirror Slack→web para member (TODO já registrado).
- RAG, embeddings, modelo, gateway, manifest.

## Riscos

- **Snapshot frágil**: qualquer edição em `.md` quebra teste. Mitigação: script `regen-snapshots.ts` deixa regeneração trivial e diff aparece no PR.
- **QA Slack depende de workspace conectado**: se preview não tiver Slack ativo, fazer cenários 3-5 via `supabase--curl_edge_functions` direto no `slack-bot` com payload sintético.
