## Causa raiz

Os logs do `slack-oauth-callback` mostram, exatamente nas tentativas de hoje (15:14 e 15:15 UTC):

```
[OAUTH] Token exchange failed: invalid_client_id
```

O fluxo está assim:

```
Frontend (useSlackConnection.ts) -> abre slack.com/oauth/v2/authorize
   client_id HARDCODED: 590136271282.10821512589809   ✅ a tela "Permitir Rhitmo" abre

Slack -> redirect para slack-oauth-callback
   o callback chama oauth.v2.access usando:
     - Deno.env.get('SLACK_CLIENT_ID')      ← valor do secret
     - Deno.env.get('SLACK_CLIENT_SECRET')  ← valor do secret
   Slack responde: invalid_client_id ❌
```

Ou seja, o `SLACK_CLIENT_ID` (e/ou `SLACK_CLIENT_SECRET`) configurado nos secrets do backend **não bate** com o app Slack `590136271282.10821512589809` que está hardcoded no frontend. Por isso o usuário vê a tela "Permitir", clica, e nada acontece — o callback morre silenciosamente em `invalid_client_id` e redireciona para `/dashboard?slack_error=invalid_client_id`.

Provavelmente o secret aponta para um app Slack antigo/diferente (ou o Client Secret foi regenerado no painel do Slack e não atualizado aqui).

## Plano de correção

1. **Validar qual app Slack é o "oficial"**
  - Frontend usa `590136271282.10821512589809` (hardcoded em `src/hooks/useSlackConnection.ts` e exposto via `VITE_SLACK_CLIENT_ID`).
  - Confirmar com você que esse é o Client ID correto no painel do Slack (api.slack.com/apps → app "Rhitmo" do workspace fasterbr).
2. **Atualizar os secrets do backend** para baterem com esse app:
  - `SLACK_CLIENT_ID` = `590136271282.10821512589809`
  - `SLACK_CLIENT_SECRET` = Client Secret correspondente (copiar de Slack App → Basic Information → App Credentials → Client Secret; pode ser preciso clicar "Show" ou regenerar).
  - `SLACK_SIGNING_SECRET` = Signing Secret do mesmo app (mesma tela).
  - `SLACK_BOT_TOKEN` = Bot User OAuth Token do mesmo app (Install App → Bot User OAuth Token, começa com `xoxb-`).
  - Usaremos `secrets--update_secret` (já existem todos esses secrets, então é UPDATE, não ADD).
3. **Eliminar a duplicação de Client ID** (boa higiene, evita esse bug voltar):
  - Remover o hardcode `const SLACK_CLIENT_ID = '590136271282...'` em `src/hooks/useSlackConnection.ts` e passar a ler de `import.meta.env.VITE_SLACK_CLIENT_ID` (esse VITE secret já existe).
  - Assim, frontend e backend ficam ambos pinados a um único valor configurado em secrets.
4. **Validar o redirect URI no painel do Slack**
  - O callback usa `${SUPABASE_URL}/functions/v1/slack-oauth-callback`.
  - Confirmar que essa URL exata está em "OAuth & Permissions → Redirect URLs" do app Slack. Se faltar, Slack também retorna `invalid_client_id` ou `bad_redirect_uri`.
5. **Testar o fluxo end-to-end**
  - Após atualizar os secrets, abrir Configurações → Ajuda → Conector Slack → Conectar.
  - Esperado: callback → `/slack/connect?state=...` → tela de sucesso → DM de boas-vindas no Slack.
  - Verificar logs de `slack-oauth-callback` (deve mostrar `Token exchange ok: true`) e `slack-link` (deve mostrar upsert + `[WELCOME_DM] Sent successfully`).

## O que eu preciso de você antes de implementar

Para passos 2 e 4, preciso que você:

- **(a)** Confirme que `590136271282.10821512589809` é o Client ID correto do app Rhitmo no workspace `fasterbr` (basta abrir o app no painel api.slack.com/apps). Cliente ID é 590136271282.10821512589809
- **(b)** Autorizo via Secrets manager os valores corretos de `SLACK_CLIENT_SECRET` e, se mudaram, `SLACK_SIGNING_SECRET` e `SLACK_BOT_TOKEN`.
- **(c)** Confirme que o Redirect URL `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-oauth-callback` está cadastrado em OAuth & Permissions do app. Confirmado: [https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-oauth-callback](https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-oauth-callback)

Assim que confirmar (a) e (c) e atualizar (b), eu aplico o passo 3 (refactor para tirar o hardcode) e validamos juntos.