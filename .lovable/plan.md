# Plano: Alinhar app Slack ao padrão conversacional (estilo Windy)

## Diagnóstico

| Item | Rhitmo (hoje) | Windy | Causa |
|---|---|---|---|
| Aba "Início" | Aparece + loading infinito | Não aparece | `home_tab_enabled: true` no painel Slack, sem `views.publish` no backend |
| Aba "Mensagens" | OK | OK | Ambos têm `messages_tab_enabled: true` |
| Aba "Sobre" | Auto-gerada pelo Slack | Auto-gerada pelo Slack | Não dá pra remover, é nativa do Slack |
| Resposta a "Oi" | Silêncio (até Sprint 18) | Resposta no thread | Modelo de conversa diferente |

A aba **"Sobre"** é gerada pelo Slack a partir dos campos `display_information` (nome, descrição, ícone) e **não pode ser ocultada**. Windy tem 2 abas (Mensagens + Sobre) porque desligou a Home tab. É exatamente esse o padrão que queremos.

## Decisão

**Opção A (recomendada — mínimo esforço):** Desligar a Home tab no painel do app, ficando idêntico ao Windy (Mensagens + Sobre). Zero código.

**Opção B (futuro):** Manter Home tab ligada e publicar uma view útil via `views.publish` no `app_home_opened` (ex.: próximas 1:1s, pulse pendente, atalho "Conversar com a Rhy"). Mais trabalho, mas vira uma "home page" do bot dentro do Slack.

Nesta sprint executamos a **Opção A** (rápida, resolve o loading e iguala ao Windy) e deixamos a Opção B documentada como sprint futura.

## Mudanças

### 1. Slack App config (manual, no painel `api.slack.com/apps`)

No app `B0APL6ST719` → **App Home**:
- **Home Tab:** OFF (atualmente está ON — causa do loading)
- **Messages Tab:** ON (manter)
- **Allow users to send Slash commands and messages from the messages tab:** ON (manter)

Não precisa reinstalar o app — mudança de tabs não exige reauth.

### 2. Renomear bot de "Rhitmo" para "Rhy" (também no painel)

Em **Basic Information → Display Information**:
- App name: `Rhy`
- Em **App Home → Your App's Presence in Slack**:
  - Bot display name: `Rhy`
  - Default username: `rhy`

Isso muda o que aparece no header da DM. Não precisa redeployar nada.

### 3. Atualizar `docs/slack-app-manifest.md`

Trocar `"name": "Rhitmo"` → `"name": "Rhy"` e ajustar `display_name`/`always_online` no bot_user. Já temos `home_tab_enabled: false` no manifest documentado, então o painel é que está fora de sincronia — depois da mudança manual ele bate com o manifest.

### 4. Atualizar memória

`mem://features/slack/configuration-constraints` — adicionar nota:
> Home tab DEVE ficar OFF. Não publicamos `views.publish` em `app_home_opened`. Se ligada, a aba "Início" exibe loading infinito.

## O que NÃO muda

- Nenhum código de edge function (`slack-bot`, `slack-link`) precisa ser alterado
- Scopes, slash commands, event subscriptions: tudo idêntico
- Sprint 18 (DM conversacional por padrão) já está deployada e continua valendo
- Nome interno "Rhitmo" no app web e em todos os outros lugares fica como está — o rename é só do bot Slack

## Sprint futura (Opção B, opcional)

Se quisermos uma Home tab rica:
1. Adicionar handler em `app_home_opened` (já existe — só trocar `chat.postMessage` por `views.publish`)
2. Montar AppHome view com Block Kit: próximas 1:1s + pulse pendente + botão "Conversar com a Rhy"
3. Re-publicar a view sempre que o estado mudar (cron + push em events relevantes)

Isso ficaria como Sprint 19+ depois de validarmos o fluxo conversacional puro.
