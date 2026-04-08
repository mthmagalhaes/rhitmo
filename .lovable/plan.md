

## Botões Funcionais de Conexão — Slack e Google Calendar

### O que existe hoje

- **Google Calendar**: Hook `useCalendarIntegration` completo com `connectCalendar()` (inicia OAuth), `disconnectCalendar()`, e checagem de status via tabela `google_calendar_tokens`. Edge Function `google-calendar-oauth` já trata authorize/callback/disconnect.
- **Slack**: OAuth flow completo via `slack-oauth-callback` Edge Function. O fluxo começa com uma URL de autorização OAuth que redireciona para `/slack/connect` após sucesso. A URL de instalação é `https://slack.com/oauth/v2/authorize?client_id=...&scope=...&redirect_uri=...`.
- **Seção de Integrações no HelpCenter**: Cards estáticos (linhas 277-298) sem botões de ação — apenas texto descritivo.

### Plano

**1. Transformar cards de integração em cards interativos com botão de conexão**

**Arquivo:** `src/pages/HelpCenter.tsx`

- Importar `useCalendarIntegration` e criar um hook para checar status do Slack (query em `slack_integrations` filtrado por `linked_user_id = user.id`)
- Substituir a seção de integrações estática por cards com:
  - **Google Calendar**: Botão "Conectar" que chama `connectCalendar()` / ou badge "Conectado ✓" + botão "Desconectar" se já conectado
  - **Slack**: Botão "Conectar ao Slack" que redireciona para a URL OAuth (`https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=commands,chat:write,...&redirect_uri=${SUPABASE_URL}/functions/v1/slack-oauth-callback`) / ou badge "Conectado ✓" se já vinculado
  - **Import de Transcrições**: Manter como card informativo (não requer conexão)
- Mostrar loading spinner enquanto verifica status de cada integração

**2. Criar hook `useSlackConnection` para checar status**

**Arquivo:** `src/hooks/useSlackConnection.ts` (novo)

- Query simples em `slack_integrations` para ver se o usuário logado tem um registro com `linked_user_id`
- Retorna `{ isConnected, slackTeamName, connectSlack() }`
- `connectSlack()` monta a URL OAuth e redireciona

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/hooks/useSlackConnection.ts` | Criar — hook de status + connect |
| `src/pages/HelpCenter.tsx` | Refatorar seção de integrações com botões funcionais |

### Resultado
Ao clicar em "Conectar" no card de Google Calendar ou Slack, o fluxo OAuth completo é iniciado automaticamente. Após a autorização, o usuário retorna à plataforma com o status "Conectado" exibido no card.

