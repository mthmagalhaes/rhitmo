
CREATE OR REPLACE FUNCTION public.get_slack_orchestrator_health(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_run_started timestamptz;
  v_last_run_status text;
  v_upcoming_count int;
  v_next_meeting jsonb;
  v_last_brief timestamptz;
  v_last_pulse timestamptz;
  v_signals_7d int;
  v_member_ids uuid[];
BEGIN
  IF auth.uid() IS NULL OR (
    auth.uid() <> p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  BEGIN
    SELECT jrd.start_time, jrd.status
      INTO v_last_run_started, v_last_run_status
    FROM cron.job j
    JOIN cron.job_run_details jrd ON jrd.jobid = j.jobid
    WHERE j.jobname = 'rhitmo-orchestrator-every-30min'
    ORDER BY jrd.start_time DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_last_run_started := NULL;
    v_last_run_status := NULL;
  END;

  SELECT count(*) INTO v_upcoming_count
  FROM public.upcoming_meetings
  WHERE user_id = p_user_id
    AND start_time BETWEEN now() AND now() + interval '20 hours'
    AND brief_dm_sent_at IS NULL
    AND member_id IS NOT NULL;

  SELECT to_jsonb(t) INTO v_next_meeting
  FROM (
    SELECT um.id, um.title, um.start_time, tm.name AS member_name,
           um.brief_dm_sent_at IS NOT NULL AS brief_sent
    FROM public.upcoming_meetings um
    LEFT JOIN public.team_members tm ON tm.id = um.member_id
    WHERE um.user_id = p_user_id
      AND um.start_time > now()
    ORDER BY um.start_time ASC
    LIMIT 1
  ) t;

  SELECT max(brief_dm_sent_at) INTO v_last_brief
  FROM public.upcoming_meetings
  WHERE user_id = p_user_id;

  SELECT array_agg(id) INTO v_member_ids
  FROM public.team_members
  WHERE manager_id = p_user_id;

  IF v_member_ids IS NULL THEN
    v_member_ids := ARRAY[]::uuid[];
  END IF;

  SELECT max(dm_sent_at) INTO v_last_pulse
  FROM public.pulse_surveys
  WHERE member_id = ANY(v_member_ids);

  SELECT count(*) INTO v_signals_7d
  FROM public.context_evidence
  WHERE evidence_type IN ('slack_activity_rollup','slack_ambient_signal')
    AND member_id = ANY(v_member_ids)
    AND occurred_at > now() - interval '7 days';

  RETURN jsonb_build_object(
    'last_orchestrator_run', v_last_run_started,
    'last_orchestrator_status', v_last_run_status,
    'upcoming_briefs_count', coalesce(v_upcoming_count, 0),
    'next_meeting', v_next_meeting,
    'last_brief_sent_at', v_last_brief,
    'last_pulse_sent_at', v_last_pulse,
    'slack_signals_7d', coalesce(v_signals_7d, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_slack_orchestrator_health(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slack_orchestrator_health(uuid) TO service_role;
