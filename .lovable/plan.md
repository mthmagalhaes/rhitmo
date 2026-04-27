# Diagnóstico do comportamento atual

## 1. Por que o bot "floda" sua DM

No arquivo `supabase/functions/slack-bot/index.ts` (linhas 1628–1654), o handler do evento `app_home_opened` dispara `chat.postMessage` com o menu de boas-vindas **toda vez que você abre ou volta para a aba Mensagens** do app Rhitmo no Slack — sem qualquer controle de frequência. Por isso, ao alternar entre abas (Início → Mensagens → Sobre → Mensagens), você vê mensagens repetidas.

Não é configuração no painel do Slack — é lógica do nosso bot que precisa mudar.

## 2. Comportamento em canais públicos (auditoria)

Boa notícia: o bot **não envia nada espontaneamente** em canais públicos. Não há listeners para `app_mention`, `message.channels` nem `member_joined_channel`. Você pode adicionar o app a canais sem risco de spam.

Sobre os slash commands em canais públicos:

| Comando | Comportamento atual em canal público | Quem vê |
|---|---|---|
| `/rhitmo` | Resposta ephemeral (default) | Só quem digitou ✅ |
| `/nota`, `/brief`, `/meu-pdi`, `/mentor`, `/meu-rhitmo` | Aviso de privacidade ("Canal Público Detectado") com Continuar/Cancelar | Só quem digitou ✅ |
| `/kudos` | Posta reconhecimento visível pra todos | Todos do canal (intencional — kudos é público) |

Ou seja: o `/rhitmo` por engano em canal público **já é seguro hoje** — só quem digitou vê o menu, ninguém mais é notificado. Você pode adicionar tranquilamente.

# Mudanças propostas

## A. Throttle do `app_home_opened` (corrige o flood)

Adicionar uma tabela leve de cache para registrar quando cada usuário recebeu a mensagem de boas-vindas via app_home, e só reenviar se passou um período mínimo.

**Regra:** enviar a mensagem de boas-vindas no máximo **1x a cada 24h** por usuário Slack. Se o usuário já mandou alguma DM real nas últimas 24h, também não reenviar (ele já viu o menu).

**Implementação:**
- Nova tabela `slack_app_home_throttle` com colunas: `slack_user_id` (PK), `slack_team_id`, `last_welcome_sent_at`.
- Antes de postar o welcome no handler `app_home_opened`, consultar a tabela. Se `last_welcome_sent_at` > now - 24h → ignora silenciosamente. Caso contrário, envia e atualiza o timestamp.
- Para usuários **não autenticados** (`persona === 'unauthenticated'`), reduzir ainda mais: enviar no máximo 1x a cada 7 dias, já que o objetivo do menu é convidar a conectar — repetir todo dia vira spam.

## B. Throttle leve no `message.im` (DM)

Hoje, cada mensagem do usuário em DM dispara o menu inteiro de volta. Vamos:
- Sempre responder à **primeira mensagem** do dia normalmente (UX de boas-vindas).
- Para mensagens subsequentes no mesmo dia, responder com algo mais discreto: apenas o menu compacto sem o "👋 Olá! Aqui estão suas ações disponíveis" repetitivo. Isso já reduz a percepção de spam.

## C. Reforço de privacidade no `/rhitmo`

Embora o `/rhitmo` já seja ephemeral por default, vou garantir explicitamente `response_type: 'ephemeral'` no `sendDelayedResponse` da rota `/rhitmo` (defesa em profundidade). Sem mudança visível para o usuário, mas blinda contra regressões futuras.

# Riscos & rollback

- Mudança é isolada à edge function `slack-bot` + 1 migração de tabela nova (sem alterar tabelas existentes).
- Se algo der errado, basta reverter a edge function — a tabela de throttle pode ficar inerte sem causar problema.

# Resposta direta às suas perguntas

1. **"Posso adicionar o app aos canais públicos do `matheus.magalhaes@fstr.co`?"** → Sim, é seguro. O bot não posta nada espontaneamente em canais e o `/rhitmo` por engano só aparece para quem digitou.
2. **"Tem como configurar para enviar 1x ao dia?"** → Sim, é o que vou implementar (throttle de 24h no welcome do app_home).
