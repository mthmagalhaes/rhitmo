## Problema

Quando uma reunião do Google Calendar tem 3 liderados do mesmo líder, o sync cria 3 linhas em `meetings` (uma por `member_id`) com o mesmo `meet_link`. O auto-schedule em `fetch-calendar-events` cria **1 único bot Recall** para aquele link (correto: evita 3 bots gravando a mesma sala) e o vincula ao `meeting_id` do primeiro liderado iterado.

A UI (`UpcomingMeetingsCard`) busca status do bot por `meeting_id` exato, então:
- 1ª linha → encontra bot → "Auto ✓"
- 2ª e 3ª linhas → não encontram → "Pendente"

Funcionalmente está tudo certo: o bot único entra, grava e a diarização atribui as falas aos 3 liderados. Só a UI engana.

## Solução

Casar bot ↔ meeting também por `meeting_url`, não só por `meeting_id`.

### Mudanças (frontend apenas)

**`src/hooks/useCalendarIntegration.ts`**
- No `useQuery` de `recall_bots`: adicionar `meeting_url` ao `select`.
- `getBotStatus(meetingId, meetingUrl?)`: primeiro tenta match por `meeting_id`; se não achar e `meetingUrl` foi passado, faz fallback por `meeting_url`.
- Atualizar a interface `RecallBot` (ou o cast `any`) para incluir `meeting_url`.

**`src/components/dashboard/UpcomingMeetingsCard.tsx`**
- Linha 239: trocar `getBotStatus(meeting.id)` por `getBotStatus(meeting.id, meeting.meet_link)`.

### Fora de escopo
- Nenhuma mudança em `fetch-calendar-events`, `recall_bots`, RLS ou diarização. O comportamento de 1 bot por link continua intacto (e correto).
- Nenhum outro componente que use `getBotStatus` precisa mudar (fallback é opcional).

## Validação
- Abrir `/lider/inicio` na conta `matheus.magalhaes@fstr.co`: as 3 linhas "Hoje 11:00" (Guilherme, Yasmin, Giovanna) devem todas mostrar "Auto ✓". Idem para "Hoje 15:00".
- Reuniões 1:1 reais (1 liderado) continuam funcionando normalmente.
