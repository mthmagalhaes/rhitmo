## Auditoria Slack: o que vendemos vs. o que está configurado

Conferi a API do Slack diretamente (workspace **Faster**, bot `@rhitmo`, app ID `B0APL6ST719`) e cruzei com o código do `slack-bot` e com o que prometemos nas várias telas. Resumo abaixo do que **funciona, do que está quebrado e do que falta configurar no manifesto do app**.

---

### 1. Slash commands — promessas vs. implementação

| Comando | Prometido em… | Implementado no `slack-bot`? | Status |
|---|---|---|---|
| `/rhitmo` (menu) | i18n, HelpCenter, SlackConnect, Dialog | ✅ linha 1225 | **OK** |
| `/nota` | i18n, HelpCenter, Dialog, Privacy | ✅ linha 1234 | **OK** |
| `/kudos` | i18n, HelpCenter, Dialog, Privacy | ✅ linha 1241 | **OK** |
| `/brief` | HelpCenter, Dialog, Privacy | ✅ linha 1266 | **OK** |
| `/meu-pdi` | HelpCenter, Dialog | ✅ linha 1273 | **OK** |
| `/mentor` | HelpCenter | ✅ linha 1278 | **OK** |
| `/meu-rhitmo` | HelpCenter | ✅ linha 1285 | **OK** |
| `/review` | **Privacy Onboarding** (lista como comando privado) | ❌ não existe | **PROMESSA QUEBRADA** |
| `/pulse` | (não prometido) | ❌ não existe | OK não prometer, mas é gap estratégico — o Pulse hoje só roda via DM proativa do orchestrator |

**Ação proposta:**
- **A)** Remover `/review` do `SlackPrivacyOnboarding.tsx` (linha 56). É o caminho mais rápido — Performance Reviews hoje são fluxo web/sheet, não Slack.
- **B)** (Opcional, futuro Sprint) implementar `/pulse` para o líder lançar/testar Pulse sem sair do Slack — alinha com a promessa "Pulse via Slack" da memória `pulse-surveys/ui-trigger-and-response`.

---

### 2. Scopes OAuth do bot — auditoria via `auth.test`

Scopes atuais (lidos do header `x-oauth-scopes`):
```
commands, chat:write, chat:write.public, users:read, users:read.email,
im:history, im:write, im:read, channels:join, app_mentions:read,
channels:read, channels:history, groups:read, groups:history
```

| Capacidade prometida | Scope necessário | Presente? |
|---|---|---|
| Slash commands | `commands` | ✅ |
| Postar como bot em canal | `chat:write`, `chat:write.public` | ✅ |
| DMs proativas (orchestrator, conversational state machine) | `im:write`, `im:history`, `im:read` | ✅ |
| App Home aberto → DM de boas-vindas | `app_home_opened` event + `im:write` | ✅ (handler em linha 1921) |
| Resolver liderado por @mention/email | `users:read`, `users:read.email` | ✅ |
| Auto-join de canais públicos (ambient classifier) | `channels:join`, `channels:history` | ✅ |
| Detectar @menção ao bot em canais | `app_mentions:read` | ✅ |
| Postar `/kudos` em canal privado | `groups:read`, `groups:history` | ✅ (read), mas falta `groups:write` |
| **Reagir** com emoji a mensagens (não usado hoje) | `reactions:write` | ❌ não tem |
| **Files**: capturar áudio/anexo via DM | `files:read` | ❌ não tem |

**Avaliação:** scopes cobrem 100% do que está implementado e prometido. Não recomendo adicionar `reactions:write` / `files:read` ainda — não há código que precise.

⚠️ **Único gap real de scope:** se o líder usar `/kudos` em **canal privado**, o `chat.postMessage` pode falhar porque falta `chat:write` em groups + bot não foi convidado. Hoje a UI só sugere usar `/kudos` em canal público (Privacy Onboarding linha 76), então comporta-se como esperado, mas vale documentar.

---

### 3. Configuração do manifesto Slack App (precisa ser conferida no painel)

Não consigo exportar o manifesto via bot token (Slack só permite via app config token). Mas pelo código sei o que **deve estar configurado** no painel do app `B0APL6ST719`:

- **Slash Commands cadastrados (precisam estar todos no manifesto, apontando para `/functions/v1/slack-bot`):**
  - `/rhitmo`, `/nota`, `/kudos`, `/brief`, `/meu-pdi`, `/mentor`, `/meu-rhitmo` — 7 comandos.
  - Verificar a flag **"Escape channels, users, and links"** ligada em todos (memória `slack/configuration-constraints`).

- **Event Subscriptions** apontando para `/functions/v1/slack-bot`:
  - `message.im` (DMs ao bot — handler linha 1802)
  - `app_home_opened` (Sprint 11.2 boas-vindas — handler linha 1921)
  - `app_mention` (scope existe mas não há handler no código — pode estar inscrito mas inerte; checar)

- **App Home** habilitada com a aba **Messages** ativa (necessária para o app_home_opened do tab='messages').

- **Interactivity** apontando para `/functions/v1/slack-bot` (botões do menu `/rhitmo` — handler linhas 1354–1380).

- **Redirect URL OAuth**: `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-oauth-callback`.

**Ação proposta:** documentar isso num arquivo `docs/slack-app-manifest.md` no repo (manifesto JSON pronto para colar) para que qualquer reinstalação do app reproduza a config exata. Isso evita o cenário "alguém recriou o app e esqueceu `/meu-rhitmo`".

---

### 4. UI do produto — pequena inconsistência de "comandos disponíveis"

Cada superfície lista um subset diferente, gerando inconsistência:

| Superfície | Lista exibida |
|---|---|
| `i18n.slackDescription` | `/rhitmo`, `/nota`, `/kudos` (incompleto) |
| `SlackConnectorDialog` | 5 comandos (faltam `/mentor`, `/meu-rhitmo`) |
| `HelpCenter` | 6 comandos (todos exceto `/meu-pdi` no copy curto) |
| `SlackPrivacyOnboarding` | `/nota`, `/brief`, **/review** (não existe), `/kudos` |

**Ação proposta:** centralizar a lista canônica num módulo `src/lib/slackCommands.ts` exportando `SLACK_COMMANDS` com `{ cmd, desc, privacy: 'private'|'public', icon? }`, e consumir em todas as 4 superfícies. Garante uma única fonte de verdade.

---

## Plano de execução

Quando aprovado, vou aplicar nesta ordem (mudanças pequenas, sem migration):

1. **Corrigir promessa quebrada:** remover `/review` do `SlackPrivacyOnboarding.tsx`.
2. **Centralizar lista canônica:** criar `src/lib/slackCommands.ts` com os 7 comandos reais + flag `privacy`. Refatorar `SlackConnectorDialog`, `SlackPrivacyOnboarding`, `HelpCenter` e a string `slackDescription` em `pt-BR.json` / `en.json` / `es.json` para consumirem dali.
3. **Documentar manifesto:** criar `docs/slack-app-manifest.md` com JSON pronto (slash commands, scopes, event subscriptions, redirect URL).
4. **Memória:** atualizar `mem://features/slack/command-ecosystem` reforçando que a fonte de verdade é `src/lib/slackCommands.ts` e que `/review` foi removido.

### Itens deixados de fora (para discussão futura, NÃO incluído na execução)

- `/pulse` slash command (Sprint próximo, complementaria o Pulse Wizard recém-feito).
- Scope `reactions:write` (sem caso de uso atual).
- Scope `files:read` (sem caso de uso atual).
- Handler de `app_mention` no bot (scope já está, falta apenas o branch no event_callback).

Confirmar e eu sigo com a execução.
