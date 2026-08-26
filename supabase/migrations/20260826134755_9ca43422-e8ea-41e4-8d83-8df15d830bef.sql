UPDATE public.recall_bots
SET status = 'dismissed',
    error_message = 'Bot duplicado removido da sala (incidente 26/08).'
WHERE recall_bot_id IN ('d3721969-d733-41ab-aafb-5249167afcc9','1d421eab-5435-48b2-ad61-bc2ed449c557');

UPDATE public.recall_bots
SET status = 'unrecoverable',
    error_message = COALESCE(error_message, 'Registro encerrado automaticamente: bot ficou travado em estado ativo.')
WHERE scheduled_at < now() - interval '1 day'
  AND status IN ('scheduled','joining','in_waiting_room','recording','in_call_recording','in_call_not_recording','processing');

CREATE UNIQUE INDEX IF NOT EXISTS recall_bots_live_url_slot_uidx
ON public.recall_bots (meeting_url, scheduled_at)
WHERE scheduled_at IS NOT NULL
  AND status IN ('scheduled','joining','in_waiting_room','recording','in_call_recording','in_call_not_recording','processing');