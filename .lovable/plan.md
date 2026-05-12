## Diagnóstico

Encontrei a causa exata. Não tem nada a ver com o manifest novo nem com a aba "Chat" — o problema é mais antigo e estava escondido.

### O que os logs mostram quando você manda "Resuma o que mudou…"

```text
[DM] Message from: U04N7M58KR6 | text: Resuma o que mudou no meu time...
[DM] Persona: unauthenticated
[DM] Throttled — not re-sending connect prompt
```

Ou seja: o bot recebe a mensagem, **te trata como não-conectado**, vê que já mandou o "Conectar Conta" hoje, e fica em silêncio. Por isso você não recebe nada.

### Por que ele acha que você não está conectado

Consultei a tabela `slack_integrations` e ela tem **um único registro**, e ele está corrompido:

| slack_user_id | user_id | created_at |
|---|---|---|
| `"undefined"` (string literal) | matheus | 2026-03-31 |

Ou seja: lá em março algum fluxo antigo de link gravou a string `"undefined"` no campo `slack_user_id` em vez do ID real do Slack (`U04N7M58KR6`). Como o lookup do `getUserPersona` filtra por `slack_user_id = 'U04N7M58KR6'`, **nunca casa** → persona = `unauthenticated` → silêncio.

### O bug secundário que aparece logo depois

```text
[EVENT] type: message | subtype: message_changed
[DM] Message from: undefined
[DM] Persona: leader
[CONV] No active conv — auto-creating general_chat for undefined
[CONV] auto-create failed: null value in column "slack_user_id"
```

Quando o Slack reenvia a mesma mensagem como `message_changed` (edição/unfurl), `event.user` vem `undefined`. O código não filtra esse subtype, então:
1. Faz lookup com `slack_user_id = undefined` → casa com a linha podre acima → persona vira `leader` falsamente.
2. Tenta auto-criar uma `slack_conversations` com `slack_user_id = null` → estoura NOT NULL.

Os dois bugs têm a mesma raiz (a linha podre) mas o segundo só foi possível porque o handler de DM aceita subtypes que não tem `event.user`.

## Plano de correção

### 1) Limpar a linha podre da tabela
Migration que apaga o registro com `slack_user_id = 'undefined'` em `slack_integrations`. Isso desbloqueia todo o resto.

### 2) Reconectar sua conta Slack
Depois da limpeza, você abre o Rhitmo na web → Configurações → Conectar Slack. O fluxo OAuth atual (`slack-oauth-callback` → HMAC state → `slack-link`) já grava o `slack_user_id` correto vindo de `tokenData.authed_user.id`. Vai gerar uma linha nova válida (`U04N7M58KR6`).

### 3) Blindar o handler de DM (`supabase/functions/slack-bot/index.ts`)
Pequenas mudanças defensivas pra impedir que isso se repita:

- **Ignorar subtypes que não são mensagem real do usuário**: dentro do bloco `if (event?.type === 'message' && event?.channel_type === 'im')`, sair cedo se `event.subtype` for `message_changed`, `message_deleted`, `bot_message`, `message_replied` etc. Slack manda esses eventos várias vezes por mensagem e nenhum deles deve disparar resposta nova.
- **Sair cedo se `event.user` for falsy** antes de qualquer lookup, pra nunca mais fazer `eq('slack_user_id', undefined)`.

### 4) Blindar a gravação em `slack-link` (`supabase/functions/slack-link/index.ts` linha ~100)
Adicionar guard `if (!slack_user_id || slack_user_id === 'undefined' || slack_user_id === 'null') return 400` antes do upsert, pra impedir que essa string ruim entre de novo se algum fluxo legacy for chamado.

### 5) Validar
- Mandar uma DM nova pro bot e confirmar nos logs:
  - `[DM] Persona: leader` (não `unauthenticated`)
  - `[CONV] No active conv — auto-creating general_chat for U04N7M58KR6` (com o ID real, não `undefined`)
  - Resposta do LLM aparecendo no Slack.
- Garantir que `message_changed` aparece nos logs como ignorado, sem efeito colateral.

## Sobre as 4 abas (Início / Chat / Histórico / Sobre)

Isso é normal e não tem relação com o bug. Veio porque você ativou o **Agent or Assistant** no painel de Agents & AI Apps — o Slack passa a renderizar o container do AI Assistant (abas Início + Chat + Histórico) além da aba Sobre padrão. Quando o bot voltar a responder, a aba **Chat** vai funcionar igual a uma DM normal e a aba **Histórico** vai listar conversas anteriores. Nenhuma alteração de código necessária aqui.

## O que NÃO está no escopo

- Mexer no manifest de novo (está correto).
- Mexer no `chat-mentor` ou no roteador de intents.
- Tocar no fluxo de OAuth — ele já está correto, só precisa ser re-executado.
