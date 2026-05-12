# Rhitmo no Slack como AI Colleague do líder

## Problema atual (já validado no código)

A DM autenticada do líder cai em `general_chat` e chama `callLovableAI()` com **só** os turnos da própria conversa — sem time, sem feedbacks, sem 1:1s, sem network signals, sem PDIs. O system prompt ainda instrui a IA a *"não inventar dados sobre o time"*. Resultado: pra "quem é meu time?" e "quais riscos abertos?", o bot responde como ChatGPT cru.

Enquanto isso, o `/mentor` (slash command, linhas 1213-1360 de `slack-bot/index.ts`) já carrega `team_members`, `feedbacks`, `work_style_data`, `leader_sync_data` e roteia pra `chat-mentor` (RAG completo). A DM ficou de fora desse pipeline.

## Objetivo

A DM com Rhitmo no Slack passa a se comportar como um **AI Colleague do líder**: lembra do time, traz contexto sob demanda, tem personalidade da marca, e ajuda no dia a dia (1:1s, riscos, feedback, decisões de pessoas). Mesma espinha dorsal de contexto do `/mentor`, mas em formato conversacional contínuo com memória de turnos.

## Arquitetura proposta

```text
┌─────────────────────────────────────────────────────────────┐
│  Slack DM autenticada (líder)                                │
│      │                                                       │
│      ▼                                                       │
│  slack-bot DM hook                                           │
│      │  (já existe: open_or_resume_slack_conversation)      │
│      ▼                                                       │
│  buildLeaderContext(userId, workspaceId, lastUserMessage)   │ ◄── NOVO helper compartilhado
│      │   - team_members + work_style                         │
│      │   - feedbacks recentes (top 15 cross-team)            │
│      │   - 1:1s próximas + recentes                          │
│      │   - network_signals ativos                            │
│      │   - hr_risk_alerts abertos                            │
│      │   - pulse pendentes / últimos resultados              │
│      │   - leader_sync_data (perfil do líder)                │
│      │   - (opcional) detecção de menção a liderado          │
│      ▼                                                       │
│  chat-mentor (RAG + persona Rhitmo)                          │
│      │   - recebe contexto + últimos N turnos                │
│      │   - responde em Markdown                              │
│      ▼                                                       │
│  markdownToSlackMrkdwn → DM                                  │
│  appendConversationTurn (assistant)                          │
└─────────────────────────────────────────────────────────────┘
```

Memória continua em `slack_conversations.state_data.turns` (sem mudança de schema). `chat-mentor` continua sendo a única fonte de verdade de RAG/persona — tanto a web (`/lider/mentor`), o `/mentor` slash, quanto a DM passam pelo mesmo lugar.

## Escopo do sprint

### 1. Helper compartilhado `_shared/buildLeaderContext.ts`
Extrair a busca de contexto que hoje vive duplicada em `handleMentorCommand` (linhas 1240-1308) e expandir com as fontes que faltam. Retorna um payload pronto pra `chat-mentor`:
```ts
{
  members: [{ id, name, role, work_style_summary }],
  recentFeedbacks: [...15 itens],
  upcomingOneOnOnes: [...próximas 7 dias],
  activeNetworkSignals: [...],
  openRiskAlerts: [...],
  pendingPulses: [...],
  leaderSyncData,
  detectedMember: null | { id, name }  // se a frase mencionar um liderado por nome
}
```
Reaproveita `resolveMember` que já existe e adiciona fuzzy match por primeiro nome no texto da pergunta.

### 2. Roteamento da DM autenticada (`slack-bot/index.ts` ~linha 2440-2470)
Quando `intent === 'general_chat'` E persona é líder:
- Chamar `buildLeaderContext`
- Montar payload e POST pra `chat-mentor` (mesmo pattern de `handleMentorCommand`)
- Passar **últimos 10 turnos** de `slack_conversations.state_data.turns` como `conversationHistory` (campo novo aceito por `chat-mentor`, ver item 4)
- Truncar resposta com `smartTruncate(markdownToSlackMrkdwn(reply), 2900)`
- `appendConversationTurn` com a resposta

Manter o fallback `callLovableAI` puro só pra personas não-líder (liderado vira `meu-rhitmo`-style num próximo sprint; HR Admin recebe mensagem dizendo que o chat de líder ainda não cobre o papel dele).

### 3. Persona da Rhitmo no system prompt do `chat-mentor`
Reforçar a "Constituição Rhitmo" (memory `ai/constituicao-rhitmo-centralizada`) no system prompt:
- Tom: colega sênior, direto, calor humano, PT-BR, sem jargão corporate
- Pode discordar do líder com gentileza (Mirror Function)
- Sempre cita evidência quando usa um dado do Context Graph (`[doc:UUID]` ou nome do liderado entre asteriscos no Slack)
- Quando não tem dado, fala explicitamente "não tenho esse sinal ainda no Context Graph — quer registrar agora?" em vez de inventar OU de bater cartão de "sou um modelo de linguagem"

### 4. `chat-mentor`: aceitar histórico conversacional
Hoje recebe `question` única. Adicionar campo opcional `conversationHistory: Array<{role, content}>` que é injetado antes da `question` na sequência de mensagens enviadas ao LLM. Sem histórico, comportamento atual preservado (zero regressão pra web e pra `/mentor`).

### 5. Quick replies que cumprem a promessa
Os botões "Pauta da próxima 1:1", "O que mudou no time?", "Riscos abertos" hoje caem no mesmo `general_chat` cru. Depois do roteamento novo, eles passam a funcionar de fato. Pequeno ajuste: cada botão envia uma `question` pré-formatada com hint de intent (ex: "Me dá a pauta da minha próxima 1:1") em vez de só abrir conversa vazia.

### 6. Limites e segurança
- RLS: `buildLeaderContext` usa service role mas filtra **sempre** por `manager_id = persona.userId` e `workspace_id = persona.workspaceId` (pattern já estabelecido na memory `edge-function-ownership-pattern`)
- Tamanho do contexto: cap de ~6k tokens enviados ao LLM (truncar feedbacks por relevância/recência)
- Latência: Slack tem SLA de 3s só pro ack; resposta vai em `EdgeRuntime.waitUntil` como já está hoje

## Fora de escopo (próximos sprints)

- Mesmo tratamento pra DM do **liderado** (intent `meu_rhitmo_chat` reaproveitando `meu-rhitmo` edge function)
- Tool calling de verdade (Rhitmo cria nota, agenda 1:1, dispara pulse via Slack) — hoje resposta é só texto
- Streaming de resposta no Slack (Slack não suporta SSE; ficaria via `chat.update` chunked, complexidade alta)
- Cache de contexto por janela curta (5 min) pra reduzir custo em conversas multi-turno

## Critério de aceite

- "Quem é meu time?" → lista os liderados com nome, papel e última 1:1
- "Quais riscos abertos?" → lê `network_signals` ativos + `hr_risk_alerts`, devolve em bullets com nome do liderado
- "Me ajuda na pauta da 1:1 com [nome]" → traz feedbacks recentes + sinais + sugestão de tópicos
- "Estou pensando em dar feedback duro pro João" → Mirror Function: pode trazer contradições do histórico
- Conversa multi-turno: 5 mensagens depois ainda lembra do que foi falado
- `/mentor` continua funcionando idêntico (zero regressão)
- Web `/lider/mentor` continua funcionando idêntico (zero regressão)

## Estimativa

1 sprint focado. Maior parte é refator + reuso. As únicas peças realmente novas são `buildLeaderContext.ts` e o roteamento condicional na DM. `chat-mentor` ganha 1 campo opcional. Sem migração de schema.
