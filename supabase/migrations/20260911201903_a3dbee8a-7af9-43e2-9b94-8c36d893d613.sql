CREATE OR REPLACE FUNCTION public.purge_expired_transcripts(_limit integer DEFAULT 500)
RETURNS TABLE(workspace_id uuid, retention_days integer, purged integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws RECORD;
  affected integer;
BEGIN
  FOR ws IN
    SELECT w.id, COALESCE(w.transcript_retention_days, 365) AS days
    FROM public.workspaces w
    WHERE w.is_active IS DISTINCT FROM false
  LOOP
    WITH leaders AS (
      SELECT DISTINCT t.leader_user_id AS uid
      FROM public.teams t
      WHERE t.workspace_id = ws.id AND t.leader_user_id IS NOT NULL
    ),
    expired AS (
      SELECT mt.id
      FROM public.meeting_transcripts mt
      JOIN leaders l ON l.uid = mt.manager_id
      WHERE mt.created_at < now() - (ws.days || ' days')::interval
        AND (mt.transcript IS NOT NULL OR mt.leader_notes IS NOT NULL)
      LIMIT _limit
    )
    UPDATE public.meeting_transcripts mt
    SET transcript = NULL,
        leader_notes = NULL,
        updated_at = now()
    FROM expired e
    WHERE mt.id = e.id;

    GET DIAGNOSTICS affected = ROW_COUNT;

    UPDATE public.recall_bots rb
    SET transcript = NULL, transcript_data = NULL, updated_at = now()
    WHERE rb.meeting_transcript_id IN (
      SELECT mt.id FROM public.meeting_transcripts mt
      WHERE mt.transcript IS NULL
        AND mt.manager_id IN (SELECT t.leader_user_id FROM public.teams t WHERE t.workspace_id = ws.id)
        AND mt.created_at < now() - (ws.days || ' days')::interval
    )
    AND (rb.transcript IS NOT NULL OR rb.transcript_data IS NOT NULL);

    IF affected > 0 THEN
      workspace_id := ws.id;
      retention_days := ws.days;
      purged := affected;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_transcripts(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_transcripts(integer) TO service_role;