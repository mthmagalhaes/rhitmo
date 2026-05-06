
## Diagnóstico

Confirmado nos logs (`slack-bot` 2026-05-06 18:10):

```
[DM] Message from: U04N7M58KR6 | text: Oi tudo bem?
[DM] Persona: leader
[THROTTLE] Skipping dm welcome (last sent 2026-05-06T01:20:51)
[DM] Throttled — not re-sending menu
```

Ou seja: a conta **está vinculada** (persona = leader), mas o handler de DM em `slack-bot/index.ts` (linhas ~2219–2380) tem a seguinte lógica:

1. Se houver `slack_conversations` ativa → roda LLM via `callLovableAI` (já funciona, é o que a Windy faz).
2. Se **não** houver conversa ativa → cai no caminho do "menu de boas-vindas" com throttle.
3. Como o menu já foi enviado nas últimas 24h → **silêncio total**.

Resultado: o usuário escreve "Oi, tudo bem?" e o bot não responde nada. O Rhitmo só vira conversacional **se** o usuário clicar antes em "🌀 Conversar com a Rhitmo" (que cria a conversa `general_chat`). Esse degrau de fricção é o que faz parecer "não-conversacional" comparado à Windy.

Sobre o botão "🧠 Gerar Pauta" e o card "Conectar Conta" persistente:

- O DM com "Conectar Conta" foi enviado **antes** da vinculação (timestamp 21h atrás na imagem). Hoje, ao clicar, o botão de fato manda para `/slack-link` de novo — mas a conta já está OK. O problema é que **a mensagem antiga não é "atualizada"** quando a conta é vinculada, então parece que o botão "não fez nada".
- O handler `prep_1on1_brief` existe (linha 1621) e está correto. A causa provável de "não acontecer nada" é que o usuário clicou no botão de **Conectar Conta** dentro do mesmo card de menu (não no "Gerar Pauta" do brief). Vou tratar ambos os casos, mas a evidência principal (logs sem `prep_1on1_brief`) indica que o clique em "Gerar Pauta" pode estar OK — preciso confirmar com um log adicional.

## O que vamos mudar (Sprint 18 — Slack Conversational Default)

### 1. DM sem conversa ativa → cria `general_chat` automaticamente

Em `supabase/functions/slack-bot/index.ts`, no bloco `event.type === 'message' && event.channel_type === 'im'`:

- **Antes** do throttle/welcome menu, se `persona !== 'unauthenticated'` e não houver conversa ativa, **criar** uma conversa `general_chat` (mesmo INSERT que o handler `start_rhitmo_chat` faz, linhas ~1762+) com `state_data.turns = [{ role: 'user', text, ts }]`.
- Em seguida, rodar a mesma rotina de LLM (`callLovableAI` + `appendConversationTurn` + `chat.postMessage`) que já existe para conversas ativas, dentro de `EdgeRuntime.waitUntil`.
- Isso elimina o "degrau" do botão. O usuário fala, o Rhy responde — exatamente como a Windy.
- O menu de boas-vindas vira **fallback exclusivo** para `unauthenticated` ou para `app_home_opened`. Para usuário autenticado em DM, **nunca mais** mandamos o card de menu como resposta — só conversa.

### 2. Throttle deixa de bloquear DMs autenticadas

Hoje `shouldSendWelcome` é chamado também para DMs autenticadas. Isso só faz sentido para o menu inicial. Vamos:

- Manter o throttle apenas para o **primeiro** menu de boas-vindas (já existe via `app_home_opened` e DM de `unauthenticated`).
- Em DM autenticada, nunca pular silenciosamente — sempre responder via LLM (item 1).

### 3. Comando proativo de Conectar Conta deixa de ficar "preso"

Quando `slack-link` finaliza com sucesso (já existe), vamos enviar uma DM curta de confirmação ("✅ Conta vinculada — agora você pode falar comigo direto por aqui, é só me chamar."). Isso resolve a sensação visual de "o botão não faz nada" (a mensagem antiga continua lá, mas vem uma nova confirmando).

- Verificar se `slack-link` já manda a welcome DM (`welcome_dm_sent_at` em `slack_integrations`). Se manda, ajustar o copy para deixar claro que **basta digitar para conversar**, em vez de listar só comandos.

### 4. Logging extra no botão "Gerar Pauta"

Adicionar `console.log` no início do case `prep_1on1_brief` (antes do `getUserPersona`) para registrar `slackUserId` + `payload.team_id`. Se o usuário reportar de novo "não fez nada", os logs nos dirão se o clique sequer chegou ou se falhou em `getUserPersona`/`generateBriefForMeeting`.

### 5. Memory update

Atualizar `mem://features/slack/conversational-state-machine.md` para registrar:
- "DM autenticada cria conversa `general_chat` automaticamente; menu só aparece em `app_home_opened` ou para não autenticados."

## Arquivos

- **Editado:** `supabase/functions/slack-bot/index.ts` (DM handler ~linhas 2219–2380; case `prep_1on1_brief` ~linha 1621 — log extra).
- **Editado:** `supabase/functions/slack-link/index.ts` (welcome DM com copy "é só digitar para conversar").
- **Editado:** `.lovable/memory/features/slack/conversational-state-machine.md`.

## Fora de escopo

- Streaming de tokens no Slack (Slack não suporta SSE).
- Cron de expiração de conversas (já tem RPC `expire_stale_slack_conversations`, mas wiring fica para depois).
- Mudar o card de menu (continua igual quando solicitado via `/rhitmo` ou `app_home_opened`).
