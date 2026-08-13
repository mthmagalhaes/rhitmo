# Por que o bot da 1:1 com a Giovanna sumiu

## O que os dados mostram

Os três bots da Giovanna terminaram em `skipped_no_leader` sempre **exatamente 5 minutos** depois do horário de entrada:

```text
agendado 13/08 17:58  ->  encerrado 18:03:18
agendado 13/08 16:58  ->  encerrado 17:03:18
agendado 12/08 16:58  ->  encerrado 17:03:20
```

Todos com `leader_check_attempts = 0`, ou seja: **o cron de detecção de líder nem chegou a rodar**. Quem marcou foi o webhook, no evento `bot.done`.

No mesmo dia, a 1:1 com a Erika (12:58) funcionou: `leader_detected = true`, 4 tentativas do cron, status `done`.

## Causa raiz

Bots criados pelo calendário (`fetch-calendar-events`) sobem com:

```text
waiting_room_timeout       = 300s  (5 min)
noone_joined_timeout       = 300s  (5 min)
in_call_not_recording_timeout = 180s
```

Você entrou depois desses 5 minutos. O bot já tinha saído sozinho por decisão do próprio Recall (sala vazia / sala de espera). Como não houve gravação de 60s, o `recall-webhook` classificou como "líder não detectado" e gravou a mensagem genérica que você viu no card.

Ou seja: **não foi falha de detecção de líder — foi timeout de espera curto demais**, e a mensagem de erro mente sobre o motivo.

## Correções propostas

1. **Aumentar a janela de espera dos bots automáticos** em `fetch-calendar-events`, alinhando com o manual: `waiting_room_timeout` 300 -> 900s, `noone_joined_timeout` 300 -> 900s, `in_call_not_recording_timeout` 180 -> 600s. Uma 1:1 que começa 10 min atrasada é o caso normal, não a exceção.

2. **Mensagem de erro honesta.** No `recall-webhook`, distinguir os motivos reais do encerramento (`sub_code` do Recall: `bot_never_admitted`, `everyone_left`, `noone_joined`) e gravar textos diferentes:
   - "Ninguém entrou na sala nos primeiros 15 min — bot saiu sozinho"
   - "Host não admitiu o bot na sala de espera"
   - "Líder não detectado" (só quando realmente houver participantes e nenhum for o líder ou o liderado)

3. **Reentrada automática quando o líder chega atrasado.** Se o bot saiu por sala vazia mas o evento do calendário ainda está no horário (até o `end_time`), o cron de sincronização pode reagendar um bot novo uma vez, com `join_at` imediato. Isso resolve o caso "cheguei 20 min atrasado" sem o líder precisar clicar.

4. **Custo:** manter o bot esperando 15 min consome tempo de máquina do Recall (~$0.50/h -> ~$0.12 por espera vazia). Para conter, o item 3 usa reentrada única e o bot continua saindo sozinho se ninguém aparecer.

## Detalhes técnicos

- `supabase/functions/fetch-calendar-events/index.ts` linhas 525-528: novos valores de `automatic_leave`.
- `supabase/functions/recall-webhook/index.ts`: em `bot.fatal`/`bot.done`, ler `data.data.sub_code` e escrever `error_message` específico; em `checkLeaderPresence`, só marcar `skipped_no_leader` quando o resolver tiver listado participantes.
- `supabase/functions/sync-calendars-cron` + `fetch-calendar-events`: permitir um reagendamento por evento quando o último bot saiu por sala vazia e a reunião ainda está dentro do horário.
- `src/components/dashboard/UpcomingMeetingsCard.tsx`: já mostra `error_message`, passa a exibir o motivo correto.
