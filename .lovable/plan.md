

## Habilitar DMs com o Bot Rhitmo no Slack

### Problema
O bot Rhitmo não aceita mensagens diretas — o Slack mostra "O envio de mensagens para esse app foi desativado". Isso acontece porque o **Messages Tab** não está habilitado nas configurações do app Slack, e o bot não processa eventos de mensagem.

### Causa raiz
1. **Configuração do Slack App**: O "Messages Tab" da aba App Home está desativado no painel do Slack (api.slack.com/apps)
2. **Código**: A edge function `slack-bot` só processa `slash commands`, `interactive components` e `url_verification`. Não processa `event_callback` (tipo usado para mensagens enviadas ao bot)

### Solução (2 partes)

#### Parte 1: Configuração manual no Slack App (você precisa fazer)

No painel do app em **https://api.slack.com/apps** > Rhitmo:

1. **App Home** > ativar **"Messages Tab"** e marcar **"Allow users to send Slash commands and messages from the messages tab"**
2. **Event Subscriptions** > ativar Events e configurar:
   - Request URL: `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-bot`
   - Em **Subscribe to bot events**, adicionar: `message.im` (mensagens diretas para o bot)
3. **OAuth & Permissions** > garantir que o scope `im:history` está presente (necessário para ler mensagens DM)
4. **Reinstalar o app** no workspace após as alterações

#### Parte 2: Atualizar a Edge Function `slack-bot`

Modificar o handler principal para processar eventos do tipo `event_callback` com subtipo `message`:

- No bloco que trata payloads JSON (linhas 1091-1099), em vez de retornar `'ok'` para qualquer JSON que não seja `url_verification`, detectar `event_callback` e processar
- Para mensagens DM do usuário ao bot:
  - Identificar o `slack_user_id` do remetente
  - Resolver a persona (líder/liderado/RH) usando `getUserPersona()`
  - Responder com um menu contextual baseado na persona (similar ao `/rhitmo`, mas adaptado ao contexto de DM)
  - Ignorar mensagens do próprio bot (`bot_id` presente) para evitar loops
- Adicionar uma mensagem de boas-vindas quando o usuário abre a DM pela primeira vez (evento `app_home_opened` com `tab: "messages"`)

**Fluxo de resposta a DMs:**
```
Usuário envia mensagem → event_callback (message.im)
  → Verificar assinatura
  → Ignorar se é bot message (evitar loop)
  → Resolver persona
  → Responder com menu de ações contextual via chat.postMessage
```

### Arquivos alterados
- `supabase/functions/slack-bot/index.ts` — adicionar handler de `event_callback` para `message.im` e `app_home_opened`

### O que você precisa fazer manualmente
Acessar https://api.slack.com/apps, selecionar o app Rhitmo, e fazer as configurações da Parte 1. Depois de aprovar este plano, eu implemento a Parte 2 (código).

