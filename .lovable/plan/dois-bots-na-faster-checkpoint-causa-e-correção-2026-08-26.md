# Dois bots na "Faster: Checkpoint" — causa e correção

## O que aconteceu (confirmado no banco)

Os dois bots na sala `meet.google.com/igi-jjsi-eir` (hoje, 10:30 BRT) são da Rhitmo, um seu e um do Vitor:

- Bot 1 — líder `matheus.magalhaes@fstr.co`, criado em 24/08 às 13:30:08 UTC, status `recording`
- Bot 2 — líder `vitor@fstr.co`, criado em 24/08 às 13:30:12 UTC, status `recording`

Nenhum dos dois deveria existir: as duas linhas da reunião em `upcoming_meetings` estão como `meeting_type = 'team'` com `auto_transcribe_opt_in = false`, ou seja, a regra "bot automático só em 1:1" já as excluiria.

O motivo é temporal: a regra de 1:1-only foi publicada em 24/08 às 18:29 UTC. Os dois bots foram criados às 13:30 do mesmo dia, cinco horas antes, sob a regra antiga, já agendados no Recall para hoje. Nada no sistema revisita bots já agendados quando as regras mudam ou quando o líder desliga o opt-in, então eles entraram como zumbis.

Dois problemas secundários que o caso expõe:

1. A dedupe por `meeting_url` (que impediria o segundo bot na mesma sala) existe, mas os dois inserts aconteceram com 4 segundos de diferença — janela de corrida entre os syncs dos dois líderes. Sem trava, os dois passam pela verificação antes de o outro gravar a linha.
2. Não existe botão para o líder tirar o bot da sala. Como vocês não são organizadores do Meet, não dá para remover por lá — o bot só sai sozinho no fim.

## Correções propostas

### 1. Varredura de bots obsoletos (resolve a causa raiz)
No `fetch-calendar-events`, antes de agendar novos bots, cancelar bots ainda `scheduled` cuja reunião hoje é `team` sem `auto_transcribe_opt_in` (ou cujo evento sumiu do calendário): chamar `POST /bot/{id}/leave/` no Recall e marcar a linha como `cancelled` com motivo. Isso limpa todos os zumbis do período pré-24/08 na próxima sincronização, para todos os líderes, não só vocês dois.

### 2. Botão "Tirar bot da reunião"
Em `UpcomingMeetingsCard`, quando o bot estiver `scheduled`, `joining`, `in_waiting_room` ou `recording`, mostrar uma ação de remover ao lado do status. Ela chama uma edge function que valida a posse do bot, pede a saída ao Recall e marca `status = 'dismissed'`. Assim o líder resolve na hora sem depender do organizador do Meet.

### 3. Trava contra bot duplicado na mesma sala
Antes de criar o bot, adquirir um `pg_advisory_xact_lock` com hash da `meeting_url` + janela de horário e reconferir a dedupe por URL dentro da trava. Fecha a corrida de segundos entre líderes diferentes na mesma call.

### 4. Ação imediata
Cancelar agora os dois bots que estão gravando (`d3721969…` e `1d421eab…`) via Recall e marcar as linhas como `dismissed`. Isso muda estado, então só executo com sua aprovação.

## Detalhes técnicos

- `supabase/functions/fetch-calendar-events/index.ts`: bloco de varredura de obsoletos antes do laço de agendamento; advisory lock no trecho de dedupe por `meeting_url` (linha ~511).
- Nova edge function `dismiss-recall-bot` (JWT + cadeia de posse: `recall_bots.user_id = auth.uid()` ou líder do time do `member_id`), usando `corsHeaders`, Zod e `safeSupabase`.
- `src/components/dashboard/UpcomingMeetingsCard.tsx`: ação de remover nos estados vivos do bot, com confirmação.
- Sem migração de schema: `status` de `recall_bots` é texto livre; usar `cancelled` e `dismissed`.
