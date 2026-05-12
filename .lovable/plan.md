# Mentor Chat ↔ Slack: histórico unificado

## Garantia para todos os líderes (Parte 1 — verificação)

A correção da DM como AI Colleague (`callLeaderMentorFromDM`) já é genérica: depende apenas de `persona.userId` + `persona.workspaceId`, resolvidos pelo `resolvePersona` que existe pra qualquer Slack user com `slack_integrations` linkado. Nenhum hardcode de e-mail. Para confirmar antes do rollout:

- Smoke test em 2 workspaces de líderes diferentes (1 com time grande, 1 com time pequeno)
- Checar logs da `slack-bot` e da `chat-mentor` por erros de ownership/RLS
- Confirmar fallback: se `persona !== leader` ou faltar `userId/workspaceId`, cai pro `callLovableAI` antigo (já está)

## Modelo de sync escolhido

**Histórico unificado read-only cross** + **1 thread por sessão Slack** (TTL 30min).

```text
Slack DM (TTL ativo)                     Web /lider/mentor
──────────────────────                   ──────────────────
nova msg líder ──┐                       
                 ▼                       
   slack_conversations (ativa)           
                 │                       
                 ▼                       
   chat-mentor (RAG leader_self)         
                 │                       
   ┌─────────────┼─────────────┐         
   ▼             ▼             ▼         
appendTurn   espelha em    resposta DM   
              chat_threads                
              + mentor_messages           
                 │                       
                 ▼                       
              ◄─── aparece na lista de threads
                   título: 1ª pergunta
                   ícone: 🌀 Slack
                   read-only (não dá pra responder na web)
```

Quando a sessão Slack expira (30min ou nova conversa criada), a thread continua lá, fechada. Próxima DM cria nova thread.

## Mudanças

### 1. Schema (`chat_threads`)
- Adicionar coluna `source text not null default 'web'` com check `('web', 'slack')`
- Adicionar coluna `slack_conversation_id uuid` (FK lógica, sem constraint pra evitar cascade) — permite reabrir/continuar caso queira no futuro
- Index `(user_id, source, updated_at desc)`
- Sem mudança de RLS (continua `effective_user_id() = user_id`)

### 2. Edge function `slack-bot` (`callLeaderMentorFromDM`)
Quando processa DM autenticada de líder:
1. **Antes** de chamar `chat-mentor`: garantir thread espelho
   - Se `slack_conversations.state_data.mirror_thread_id` existe → usar
   - Senão: criar `chat_threads` (`type='mentor'`, `source='slack'`, `user_id=persona.userId`, `member_id=null`, `title=` primeiras ~60 chars da pergunta), salvar id em `state_data.mirror_thread_id` via `appendConversationTurn`
2. **Depois** de receber resposta: inserir 2 linhas em `mentor_messages` (user msg + assistant reply) referenciando a thread espelho
3. Falha no espelhamento **não** quebra a resposta no Slack (try/catch + log)

### 3. Frontend (`ThreadsList`, `MentorHistoryCard`)
- Mostrar badge/ícone "🌀 Slack" nas threads com `source='slack'`
- Ao abrir uma thread Slack em `/lider/mentor/:threadId`: bloquear o input com banner "Esta conversa aconteceu no Slack. Continue por lá ou inicie uma nova thread."
- Botão "Nova conversa na web" no topo

### 4. Componente `MentorChat` (modo read-only)
- Nova prop `readOnly?: boolean` derivada de `thread.source === 'slack'`
- Esconde `PromptInput`, mostra banner com link `slack://...` (deep link opcional, fallback texto)

## Fora de escopo (próximos sprints)

- **Sync bidirecional**: responder na web e empurrar pro Slack (requer push API + lidar com TTL)
- **Espelhar `meu_rhitmo` do liderado** (mesma arquitetura, ativar quando DM do liderado virar AI Colleague)
- Botão "Continuar no Slack" deep link (precisa workspace_id + user_id)
- Merge de threads Slack consecutivas curtas

## Critério de aceite

- Líder conversa 3 msgs na DM Slack → abre `/lider/mentor` → vê thread "🌀 [primeira pergunta]" no topo, com as 6 mensagens (3 user + 3 assistant)
- Abrir thread Slack na web mostra histórico read-only com banner explicativo
- Threads criadas na web continuam funcionando idênticas, com input ativo
- Conversa no Slack ainda em TTL ativo: nova msg vai pra **mesma** thread espelho
- TTL expira no Slack → próxima DM cria **nova** thread espelho
- Falha de espelhamento (RLS, etc.) **não** quebra resposta no Slack — só loga
- `/mentor` slash command e `/lider/mentor` web continuam idênticos (zero regressão)

## Estimativa

1 sprint. Migração simples + 1 helper em `slack-bot` + 2 ajustes leves no frontend (`ThreadsList`, `MentorChat`). Sem mudança em `chat-mentor`.
