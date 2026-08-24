# Bot só em 1:1 por padrão

Concordo com sua leitura. Hoje a sincronização agenda bot automaticamente para qualquer reunião com até 5 liderados. Numa reunião de alinhamento semanal com vários líderes do mesmo workspace, cada líder dispara o próprio bot na mesma sala — daí as 5-6 solicitações de entrada que você rejeitou. Em reunião grande o bot também entrega pouco: o valor está na 1:1.

## O que muda

1. **Auto-transcrição só em 1:1.** A sincronização de agenda continua registrando reuniões de time (elas seguem aparecendo em "Próximas 1:1s" com o chip `Equipe`), mas o bot automático só é agendado quando `meeting_type = '1on1'` (exatamente um humano além do líder).

2. **Reunião de time vira opt-in, com controle na plataforma.** No card "Próximas 1:1s", toda reunião de equipe mostra um botão claro de "Transcrever esta reunião" (envio imediato via microfone) e, para reuniões futuras, um toggle "Transcrever quando começar" que marca aquele evento para receber bot automático na próxima sincronização. Continua existindo "Chamar bot em outra reunião" para colar um link avulso. Nada é enviado sem escolha do líder.

3. **Anti-colisão entre líderes.** Antes de enviar bot (automático ou manual), checar se já existe bot vivo para a mesma `meeting_url` de qualquer usuário do mesmo workspace. Se existir, não envia um segundo — a transcrição é compartilhada em vez de duplicar solicitações de entrada na mesma sala.

4. **Caminho alternativo visível.** Para reuniões de equipe, o card indica que a transcrição do Meet pode ser subida via upload, que já ganha resumo, abas e "Pergunte à Rhitmo" como as do bot.

## Detalhes técnicos

- `supabase/functions/fetch-calendar-events/index.ts`: no laço de auto-schedule, agendar quando `meeting_type === '1on1'` OU quando o líder marcou o evento (`auto_transcribe_opt_in = true` na linha de `upcoming_meetings`); caso contrário, pular. O upsert em `upcoming_meetings` segue inalterado e preserva o opt-in existente.
- Migração pequena: coluna `auto_transcribe_opt_in boolean not null default false` em `upcoming_meetings` (o líder liga por reunião no card).
- Dedup por sala: consultar `recall_bots` por `meeting_url` com status vivo (`scheduled`, `joining`, `in_waiting_room`, `recording`, ...) unindo pelos `user_id` do workspace; aplicar tanto em `fetch-calendar-events` quanto em `schedule-recall-bot` (hoje o dedup é apenas `eq('user_id', userId)`).
- `UpcomingMeetingsCard.tsx`: para `meeting_type === 'team'`, exibir o toggle "Transcrever quando começar" + microfone "Transcrever agora", com tooltip explicando que em reunião de equipe o bot só entra por escolha do líder.
- `AdHocBotDialog.tsx` permanece como está.

## Fora de escopo

Nenhuma alteração em uploads, resumos, avaliações ou Slack.
