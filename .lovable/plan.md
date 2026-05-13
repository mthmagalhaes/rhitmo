## Objetivo

Fazer o botão nativo do Slack **"Adicionar o app a um canal"** (visto no benchmark do Windy) aparecer e funcionar para o Rhitmo em canais públicos **e privados**, sem precisar de `/invite @Rhitmo` manual.

## Causa-raiz

O menu "..." → "Adicionar o app a um canal" é UI nativa do Slack. Ele só lista canais onde o bot tem scope de escrita. O manifest atual tem apenas leitura de privados (`groups:read` + `groups:history`), sem `groups:write` — por isso o fluxo via UI parece "sumido" para canais privados e fica capenga em alguns workspaces.

## Mudanças

### 1. Atualizar `docs/slack-app-manifest.md`

Adicionar 2 scopes ao bloco `oauth_config.scopes.bot` e à lista "Required scopes":

- `groups:write` — permite o bot ser adicionado/sair de canais privados pela UI nativa
- `mpim:write` (opcional, baixo custo) — group DMs, completa a paridade com Windy

Nada muda nas slash commands, eventos, ou App Home.

### 2. Reinstalar o app no workspace Faster

Como mudança de scope, o Slack obriga reautorização:

1. Você abre o manifest atualizado em https://api.slack.com/apps → app Rhitmo → **App Manifest** → cola o JSON novo → **Save Changes**.
2. Slack mostra "Reinstall to Workspace" → você clica e aprova.
3. O `SLACK_BOT_TOKEN` continua o mesmo (mesmo app), mas com scopes ampliados.

### 3. Verificação (sem código novo)

Depois do reinstall, no Slack:
- Abrir DM com `@Rhitmo` → "..." → **Mais ações** → **Abrir detalhes do app** → confirmar que aparece **"Adicionar o app a um canal"** como primeira opção.
- Selecionar um canal **privado** novo no dropdown → **Adicionar** → confirmar que entra sem erro.
- Em `/slack/channels` na web, o canal aparece como `is_member: true` na próxima query (cache de 60s).

## Fora de escopo

- Nenhuma mudança em código (frontend ou edge functions).
- Nenhuma mudança em `slack-list-channels`, `slack-bot`, ou nos hooks.
- Nenhuma migration de DB.

## Detalhes técnicos

- Manifest é a única source-of-truth do Slack — mudar lá basta.
- `groups:write` é scope estável, não-deprecated, sem impacto em DMs ou em canais públicos.
- O bot continua **sem acesso** a canais privados onde não foi adicionado (Slack não expõe nem via `groups:write`).
- A privacidade do "nunca ler DMs alheios / nunca canais sem ser membro" segue intacta.
