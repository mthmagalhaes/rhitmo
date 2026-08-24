# Bot só em 1:1 por padrão

Concordo com sua leitura. Hoje a sincronização agenda bot automaticamente para qualquer reunião com até 5 liderados. Numa reunião de alinhamento semanal com vários líderes do mesmo workspace, cada líder dispara o próprio bot na mesma sala — daí as 5-6 solicitações de entrada que você rejeitou. Em reunião grande o bot também entrega pouco: o valor está na 1:1.

## O que muda

1. **Auto-transcrição só em 1:1.** A sincronização de agenda continua registrando reuniões de time (elas seguem aparecendo em "Próximas 1:1s" com o chip `Equipe`), mas o bot automático só é agendado quando `meeting_type = '1on1'` (exatamente um humano além do líder).

2. **Reunião de time vira opt-in.** No card, a reunião de equipe mostra o botão "Chamar bot agora" (já existe) — o líder decide caso a caso. Nada é enviado sem clique.

3. **Anti-colisão entre líderes.** Antes de enviar bot (automático ou manual), checar se já existe bot vivo para a mesma `meeting_url` de qualquer usuário do mesmo workspace. Se existir, não envia um segundo — a transcrição é compartilhada em vez de duplicar solicitações de entrada na mesma sala.

4. **Caminho alternativo visível.** Para reuniões de equipe, o card indica que a transcrição do Meet pode ser subida via upload, que já ganha resumo, abas e "Pergunte à Rhitmo" como as do bot.

## Detalhes técnicos

- `supabase/functions/fetch-calendar-events/index.ts`: no laço de auto-schedule, pular quando `meeting.meeting_type !== '1on1'`; manter o upsert em `upcoming_meetings` inalterado.
- Dedup por sala: consultar `recall_bots` por `meeting_url` com status vivo (`scheduled`, `joining`, `in_waiting_room`, `recording`, ...) unindo pelos `user_id` do workspace; aplicar tanto em `fetch-calendar-events` quanto em `schedule-recall-bot` (hoje o dedup é apenas `eq('user_id', userId)`).
- `UpcomingMeetingsCard.tsx`: para `meeting_type === 'team'`, tooltip do microfone explica que bot em reunião de equipe é sob demanda; sem mudança de layout.
- Sem migração de banco: `meeting_type` e `attendee_count` já existem.

## Fora de escopo

Nenhuma alteração em uploads, resumos, avaliações ou Slack.
