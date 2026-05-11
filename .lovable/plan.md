## Diagnóstico

O flood não parece vir do gerador de brief em si. O clique em `Gerar Pauta` chama `prep_1on1_brief` e, pelos logs recentes, ele gera exatamente o brief esperado.

O excesso vem de dois pontos do `slack-bot`:

1. **Eventos de abertura da aba Mensagens/App Home**
   - O handler `app_home_opened` envia o menu principal via `buildRhitmoMenu`.
   - No Slack, clicar em botões/abrir a conversa pode disparar esse evento, então o menu aparece no meio do fluxo de brief.

2. **Mensagens de conexão para usuário “não autenticado”**
   - Quando `getUserPersona()` não encontra integração estável para o Slack user, `buildRhitmoMenu()` monta o bloco “Conecte sua conta Rhitmo”.
   - Esse bloco é grande e repetitivo, e hoje pode aparecer mais de uma vez porque está acoplado ao menu/welcome, não a uma intenção explícita do usuário.

Além disso, a direção de produto mudou: a Rhitmo no Slack deve se comportar mais como Chief of Staff/LLM e menos como bot de menu. Então o menu deve ser exceção, não resposta padrão.

## Plano de correção

### 1. Parar de enviar menu em `app_home_opened`
- Alterar o handler de `app_home_opened` para **não postar mensagem automaticamente** quando a aba Mensagens for aberta.
- Se necessário, manter apenas log/throttle interno, sem `chat.postMessage`.
- Resultado: abrir/voltar para a conversa com a Rhitmo não dispara menu nem blocos de conexão.

### 2. Transformar DM sem conversa ativa em resposta conversacional
- Manter a lógica atual que auto-cria `general_chat` para usuário autenticado.
- Garantir que qualquer mensagem direta do líder seja tratada como conversa natural com LLM, não como trigger de menu.
- O menu só deve aparecer quando o usuário executar explicitamente `/rhitmo` ou clicar em uma ação que peça menu.

### 3. Reduzir drasticamente o menu `/rhitmo`
- Trocar o menu grande atual por uma resposta curta e orientada a linguagem natural.
- Exemplo de comportamento:
  - “Sou a Rhitmo, seu Chief of Staff de liderança. Você pode me pedir em linguagem natural: preparar uma 1:1, registrar uma nota, gerar um brief ou revisar pendências.”
- Manter botões apenas se forem realmente úteis, em pequena quantidade.
- Remover/evitar a seção longa de “comandos rápidos” e “No Rhitmo Web” do fluxo padrão.

### 4. Controlar mensagens de conexão
- Mostrar “Conectar Conta” apenas quando:
  - o usuário está de fato sem integração; e
  - ele tentou uma ação que exige conta conectada, como `/brief`, `/nota`, `Gerar Pauta`, ou DM autenticada.
- Não enviar múltiplos blocos de conexão por abertura de aba ou fallback de menu.
- Para usuário não conectado em DM, responder com uma única mensagem curta, sem menu.

### 5. Melhorar o fluxo do botão `Gerar Pauta`
- Ao clicar em `Gerar Pauta`, responder apenas com:
  - feedback curto de processamento, se necessário; e
  - o brief/pauta final.
- Não acionar menu, onboarding, comandos rápidos ou conexão se o usuário já está conectado.
- Manter `response_type: ephemeral` para evitar poluir canais e reduzir ruído.

### 6. Validar com logs e teste do Edge Function
- Conferir logs do `slack-bot` para um clique `prep_1on1_brief`.
- Validar que, após o clique, aparecem apenas logs do handler de brief e nenhuma chamada de envio de menu por `app_home_opened`.
- Testar que `/rhitmo` ainda funciona como fallback explícito, mas não é disparado automaticamente.

## Arquivos prováveis

- `supabase/functions/slack-bot/index.ts`
  - `buildRhitmoMenu`
  - `processInteraction` / `prep_1on1_brief`
  - handler de `message.im`
  - handler de `app_home_opened`
  - `shouldSendWelcome` se necessário

- Possivelmente memória/documentação Slack, se quisermos registrar a nova regra de produto:
  - “Slack é conversational-first; menus só por comando explícito.”

## Resultado esperado

Depois da correção, o líder clica em `Gerar Pauta` e recebe apenas a pauta/brief daquela pessoa. A Rhitmo deixa de floodar a DM com menu principal e mensagens repetidas de conectar conta, ficando mais próxima de um Chief of Staff conversacional.