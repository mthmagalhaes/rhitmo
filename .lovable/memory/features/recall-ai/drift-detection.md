---
name: Recall Bot Drift Detection & Late-Join
description: fetch-calendar-events cancela bot quando reunião remarcada (drift > 5min) e UpcomingMeetingsCard mostra "Enviar agora" para bot drifted
type: feature
---
**Bug 17/06:** reunião remarcada no Google após bot agendado → bot ficou com `scheduled_at` 3h depois do start_time real → não entrou na reunião.

**Fix em fetch-calendar-events:** ao iterar `matchedMeetings`, busca `recall_bots` existente com `scheduled_at`. Se `|newJoinAt - oldScheduledAt| > 5min` e status ∈ {scheduled, joining} e meeting ainda futuro, chama `/leave/` no Recall, marca bot como `error` com error_message explicativo, e deixa o fluxo abaixo recriar. Hard cap subiu de 2 → 3 tentativas/24h para acomodar o reschedule.

**Fix em UpcomingMeetingsCard:** `botDriftedTooLate = bot.status==='scheduled' && bot.scheduled_at - meeting.start_time > 5min`. Quando true, esconde badge "Auto ✓ / Agendado" e (se isHappeningNow) mostra "Enviar agora".

**waiting_room_timeout:** 120s → 300s em ambas edge functions, dando 5min pro líder atrasado entrar e admitir o bot.
