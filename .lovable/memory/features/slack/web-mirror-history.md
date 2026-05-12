---
name: Slack ↔ Web Mentor Mirror
description: Slack DM autenticada do líder espelha cada turno (user + assistant) numa thread `chat_threads` (source='slack', slack_conversation_id) + mentor_messages, aparecendo read-only em /lider/mentor; thread por sessão Slack (TTL 30min) via state_data.mirror_thread_id
type: feature
---

# Slack ↔ Web Mentor Mirror (Sprint 20)

## Schema
- `chat_threads.source` text default 'web' check ('web','slack')
- `chat_threads.slack_conversation_id` uuid (sem FK, evita cascade)
- index `(user_id, source, updated_at desc)`

## slack-bot edge function
- `mirrorSlackTurnToWebThread(conv, userId, userText, assistantText)` em supabase/functions/slack-bot/index.ts
- Lê `conv.state_data.mirror_thread_id`; se não existe, INSERT em chat_threads (type='mentor', source='slack', title=primeiros 60 chars), grava id em state_data via update direto em slack_conversations
- INSERT 2 linhas em mentor_messages (user + assistant), bumpa updated_at da thread
- Falha silenciosa (try/catch + log) — nunca quebra resposta no Slack
- Chamado APENAS quando persona.persona === 'leader' && conv.intent === 'general_chat' && persona.userId, depois do appendConversationTurn do assistant

## Frontend
- ThreadsList e MentorHistoryCard: SELECT inclui `source`; threads com source='slack' navegam pra /lider/mentor/:threadId (não pra /member/:id?thread=); badge "🌀 Slack"
- MentorChat: nova prop `readOnly` esconde composer e renderiza banner "Esta conversa aconteceu no Slack 🌀"
- MentorThread.tsx: deriva `readOnly={thread?.source === 'slack'}` da query do thread

## Fora de escopo
- Sync bidirecional (responder na web push pro Slack)
- Espelhamento da DM do liderado (meu_rhitmo)
- Deep link "Continuar no Slack"
