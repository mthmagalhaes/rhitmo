## Objetivo

Fechar o ciclo da alma centralizada: web e Slack passam a montar 100% do system prompt via `composeSystemPrompt(...)` do `_shared/soul/loader.ts`. Liderado falando com a Rhitmo no Slack DM deixa de cair no prompt de 1 linha e passa a usar o mesmo motor de RAG do `chat-mentor`, agora em modo `member_self`.

## Diagnóstico do estado atual

```text
chat-mentor/index.ts (1266 linhas)
├── mode='leader_self' → buildLeaderCoachSystemPrompt()    ✅ já isolado
└── mode='member'      → memberSystemPrompt INLINE         ❌ ~250 linhas
                        (linhas 833-1068, usa
                         RHITMO_IDENTITY, GUARDRAILS_PROMPT,
                         ANALYSIS_RULES + tom + drafting +
                         identidade + protocolo + citações)

slack-bot/index.ts
├── leader  + general_chat → callLeaderMentorFromDM → chat-mentor leader_self  ✅
├── member  + general_chat → callLovableAI(prompt 1 linha)                     ❌ retrocesso
├── pulse_survey / 1v1_prep / self_review → callLovableAI(prompt 1 linha)      ❌
└── buildSystemPromptForIntent() = 4 strings hardcoded                          ❌
```

Falta em `chat-mentor` o modo `member_self` (liderado falando da própria carreira). O `.md` `modes/member-self.md` já existe; só falta um caminho de execução que carregue dados do próprio liderado e chame o loader.

## Entregáveis

### 1. Refatorar `chat-mentor/index.ts` modo `member` para usar o loader

- Substituir as ~250 linhas de `memberSystemPrompt` (linhas 833-1068) por:
  ```ts
  const systemPrompt = systemPromptOverride ?? await composeSystemPrompt({
    mode: 'leader-member',
    channel: channel === 'slack' ? 'slack' : 'web',
    vars: {
      memberName, firstName, memberRole: memberRole || 'Não informado',
      managerName: targetManagerName, managerFirstName,
    },
    appendices: [
      contextModeInstruction,         // já existe (manual vs auto)
      objectivesSection,              // já existe
      formatWorkStyle(workStyleData), // já existe
      formatLeaderProfile(leaderSyncData),
      timeWindowBlock,                // extrair o `if (timeWindow)` atual
      `## HISTÓRICO DE NOTAS (CONTEXT_DOCUMENTS)\n\n${contextLines}`,
    ],
  });
  ```
- Mover blocos hoje hardcoded no prompt (drafting, citações, identidade, anti-injection, formato de saída, síntese honesta, janela temporal) para os `.md` correspondentes em `_shared/soul/`. Em quase todos os casos esses blocos JÁ EXISTEM nos `.md` — só precisamos confirmar paridade e remover do código.
  - `04-drafting.md` ← bloco "GERADOR DE RASCUNHOS" + tabela de calibração Rhitmo Sync
  - `03-tone-and-format.md` ← Executive Summary + Síntese Honesta + "o que evitar"
  - `05-citations.md` ← protocolo `[doc:UUID]` + janela temporal + nota sobre `ctx:slack_activity_rollup`
  - `06-identity-protocol.md` ← protagonista / filtro de ruído / variações de apelido
  - `01-guardrails.md` ← anti prompt-injection + cautela com transcrição
- Refatorar `buildLeaderCoachSystemPrompt` (linha 599) para virar wrapper de `composeSystemPrompt({ mode: 'leader-self', channel, vars, appendices })`. `rhitmo-leader-coach.ts` fica como façade até remover.
- Marcar `RHITMO_IDENTITY`, `GUARDRAILS_PROMPT`, `ANALYSIS_RULES` em `rhitmo-constitution.ts` como deprecated (re-exports vazios ou avisando).

### 2. Adicionar modo `member_self` em `chat-mentor/index.ts`

Hoje só aceita `mode = 'leader_self' | 'member'`. Adicionar terceiro:

- `body.mode === 'member_self'` → liderado conversando da própria carreira (Meu Rhitmo).
- Resolução de contexto:
  - `memberId` resolvido via `linked_user_id = auth user` (mesma lógica do endpoint `/meu-rhitmo`).
  - RAG do próprio histórico do liderado: feedbacks compartilhados (`visibility='shared'`) + `context_evidence` onde ele é protagonista. Threshold/top-k iguais ao modo member.
  - **NÃO incluir** notas privadas do líder (RLS deve garantir, mas o filtro explícito é defesa em profundidade).
- Prompt: `composeSystemPrompt({ mode: 'member-self', channel, vars: { memberName }, appendices: [contextLines, timeWindowBlock] })`.
- Resposta segue a mesma forma (streaming/JSON) do modo `member`.

### 3. Refatorar `slack-bot/index.ts`

- `buildSystemPromptForIntent(intent)` deixa de existir como string-table. Vira:
  ```ts
  async function buildSystemPromptForIntent(intent: string, vars: Record<string,string>) {
    const map: Record<string, Mode> = {
      pulse_survey: 'pulse-survey',
      '1v1_prep':   'one-on-one-prep',
      self_review:  'self-review',
      general_chat: 'leader-self', // fallback genérico só pra modos sem rota dedicada
    };
    return composeSystemPrompt({ mode: map[intent] ?? 'leader-self', channel: 'slack', vars });
  }
  ```
- **Roteamento ampliado** (bloco `if persona.persona === 'leader' && intent === 'general_chat'` na linha 2614):
  ```ts
  if (intent === 'general_chat' && persona.userId && persona.workspaceId) {
    if (persona.persona === 'leader') {
      assistantText = await callLeaderMentorFromDM(persona, userText, recent);
    } else if (persona.persona === 'member' || persona.persona === 'liderado') {
      assistantText = await callMemberMentorFromDM(persona, userText, recent); // novo
    } else {
      // fallback p/ personas sem contexto resolvido
      assistantText = await callLovableAI([{role:'system', content: await buildSystemPromptForIntent(intent, {})}, ...recent, {role:'user', content: userText}]);
    }
  }
  ```
- Criar `callMemberMentorFromDM(persona, question, history)`: análogo a `callLeaderMentorFromDM`, mas faz `POST /functions/v1/chat-mentor` com `mode: 'member_self'`, `memberUserId: persona.userId`, `channel: 'slack'`. Retorna texto convertido com `markdownToSlackMrkdwn` + `smartTruncate`.
- Mirror para web (`mirrorSlackTurnToWebThread`) também passa a rodar para member, espelhando em uma thread tipo `meu-rhitmo` (mesmo mecanismo, só ajusta `type` se necessário). Essa parte é opcional nesta sprint — se gerar atrito com schema atual do `chat_threads.type`, deixa para sprint seguinte e só registra TODO.

### 4. Garantias contra drift

- Estender `loader_test.ts` com 2 novos casos:
  - `member-self` com `channel: 'slack'` contém o bloco `mode-member-self` e o bloco `channel-slack`, e NÃO contém `channel-web`.
  - Snapshot dos modos `leader-member` e `member-self` (web e slack) salvos em `_test/__snapshots__/`. Mudança em `.md` exige aprovação do snapshot.
- Atualizar `mem://ai/soul-centralizada-md`: marcar Sprint atual como ✅ refatoração concluída, listar os 3 caminhos vivos (web `leader-member`, web/slack `leader-self`, slack/web `member-self` via chat-mentor).

### 5. QA manual antes de fechar

1. Web Mentor Chat com líder analisando liderado X — resposta mantém H3 + emoji + Síntese Honesta + citações `[doc:UUID]`.
2. Web "Coaching pessoal do líder" — resposta mantém tom de provocação, sem citar liderado específico.
3. Slack DM líder ("como vai a Gabi este mês?") — mesma estrutura do web, mas em mrkdwn (`*negrito*`, sem `###`), com janela temporal aplicada.
4. Slack DM liderado ("o que vc acha de eu pedir aumento?") — agora responde como `member_self`: tom acolhedor, RAG do próprio histórico, NÃO sugere mostrar pro líder, formato Slack mrkdwn.
5. Slack `pulse_survey` / `1v1_prep` / `self_review` — sai do prompt 1-linha, passa a herdar identidade + guard-rails do soul (formato Slack).

## O que NÃO muda

- RAG, embeddings, `match_feedbacks`, `match_context_evidence`, `embed-context-evidence`, `detectTimeWindow` — intactos.
- Streaming, persistência de threads (`mentor_messages`, `chat_threads`, `slack_conversations`) — intactos.
- Slack manifest, OAuth, AI Assistant container, comandos slash — intactos.
- Modelo (`google/gemini-2.5-flash` no Slack, `gpt-5`/configurado no web) e gateway — intactos.

## Ordem de execução

1. Adicionar modo `member_self` em `chat-mentor` (reusa loader que já existe).
2. Refatorar prompt do modo `member` para `composeSystemPrompt({mode:'leader-member'})` + appendices.
3. Refatorar `buildLeaderCoachSystemPrompt` para wrapper do loader.
4. Trocar `buildSystemPromptForIntent` no slack-bot por chamada async ao loader.
5. Adicionar `callMemberMentorFromDM` + roteamento `member general_chat → chat-mentor member_self`.
6. Estender testes de paridade + snapshots.
7. QA manual nos 5 cenários acima.
8. Atualizar memória.

## Riscos e mitigação

- **Paridade de prompt**: se algum bloco `.md` ainda não capturar 100% do que está inline (ex: tabela de calibração de drafting com 7 linhas exatas), o tom da resposta pode mudar sutilmente. Mitigação: comparar prompt antes/depois no snapshot e ajustar o `.md` antes do merge.
- **`mode: 'member_self'` é caminho novo**: começar com o roteamento Slack atrás de uma flag implícita (só aciona se `persona.persona === 'member'` E `persona.userId` resolvido); se algo der errado, cai no `callLovableAI` antigo. Após 1 semana estável, remover o fallback.
- **`channel: 'slack'` em chat-mentor**: hoje o JSON aceita `channel` mas só o usa para o leader_self. Garantir que o caminho `member` também respeita e passa para o loader (afeta formatação final).
