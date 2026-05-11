## Problema

O bot Rhitmo está postando a mesma mensagem de aviso de transcrição **uma vez por participante** que entra no Google Meet (visível no screenshot do Matheus em "Alinhamento semanal — 11 de…"). Em reuniões com várias pessoas — ou com reconexões de rede / abas duplicadas — vira spam.

## Causa

Em `supabase/functions/schedule-recall-bot/index.ts` (linhas 180–190) configuramos dois hooks de chat ao criar o bot na API do Recall.ai:

- `on_bot_join` — dispara 1x quando o bot entra. OK.
- `on_participant_join` com `exclude_host: true` — dispara **uma vez para cada participante** que entra. Esse é o causador do spam. Reconexões e múltiplas abas contam como novos joins.

Como a configuração é enviada na criação do bot (não há estado nosso para deduplicar), o Recall reenvia a mensagem N vezes por design.

## Correção

Remover `on_participant_join` e manter só `on_bot_join` com `pin: true`. A mensagem fixada (pinned) já fica visível no topo do chat para qualquer pessoa que entrar depois — exatamente o objetivo do aviso de privacidade, sem spam.

### Arquivo afetado

`supabase/functions/schedule-recall-bot/index.ts` — substituir o objeto `chat` por:

```ts
chat: {
  on_bot_join: {
    send_to: "everyone",
    message: "👋 Olá! Sou o assistente Rhitmo. Esta reunião está sendo transcrita para fins de anotações e desenvolvimento profissional. Se tiver dúvidas, fale com seu líder.",
    pin: true,
  },
},
```

Bots já agendados para reuniões futuras carregam a configuração antiga (foi enviada na criação) — não dá para retroagir sem cancelar e reagendar. Para reuniões já criadas o comportamento antigo persiste; novas agendas (auto_calendar e manual) passam a usar o fluxo limpo imediatamente após o deploy.

## Validação

- Deploy da edge function `schedule-recall-bot`.
- Agendar uma reunião de teste com 2+ participantes e verificar que só aparece a mensagem inicial fixada do bot.
- Nenhuma alteração em UI/banco/RLS.

## Fora de escopo

- Mexer no fluxo de detecção de líder (`leader_check_due_at`, cron `check-pending-leader-presence`).
- Mudar texto/copy do aviso (mantém o atual).
- Cancelar/reagendar bots já criados para reuniões futuras.
