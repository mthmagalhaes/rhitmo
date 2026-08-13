CREATE TABLE public.bot_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,
  member_id UUID,
  recall_bot_id UUID,
  recall_bot_external_id TEXT,
  meeting_title TEXT,
  recording_started_at TIMESTAMPTZ,
  recording_ended_at TIMESTAMPTZ,
  machine_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
  transcription_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  estimated_cost_brl NUMERIC(12,4) NOT NULL DEFAULT 0,
  fx_rate NUMERIC(8,4) NOT NULL DEFAULT 5.80,
  source TEXT NOT NULL DEFAULT 'recall',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bot_usage_events_bot_uniq ON public.bot_usage_events (recall_bot_id) WHERE recall_bot_id IS NOT NULL;
CREATE INDEX bot_usage_events_user_created_idx ON public.bot_usage_events (user_id, created_at DESC);
CREATE INDEX bot_usage_events_workspace_idx ON public.bot_usage_events (workspace_id, created_at DESC);

GRANT SELECT ON public.bot_usage_events TO authenticated;
GRANT ALL ON public.bot_usage_events TO service_role;

ALTER TABLE public.bot_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read bot usage"
ON public.bot_usage_events FOR SELECT TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_cost_report(p_month DATE DEFAULT date_trunc('month', now())::date)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  workspace_id UUID,
  workspace_name TEXT,
  meetings BIGINT,
  bot_hours NUMERIC,
  transcription_hours NUMERIC,
  recall_cost_usd NUMERIC,
  ai_cost_usd NUMERIC,
  total_cost_usd NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ := date_trunc('month', p_month)::timestamptz;
  v_end TIMESTAMPTZ := (date_trunc('month', p_month) + interval '1 month')::timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH recall AS (
    SELECT b.user_id AS uid,
           max(b.workspace_id::text)::uuid AS wid,
           count(*)::bigint AS meetings,
           round(sum(b.machine_minutes) / 60.0, 2) AS bot_hours,
           round(sum(b.transcription_minutes) / 60.0, 2) AS transcription_hours,
           round(sum(b.estimated_cost_usd), 4) AS recall_cost_usd
    FROM public.bot_usage_events b
    WHERE b.created_at >= v_start AND b.created_at < v_end
    GROUP BY b.user_id
  ),
  ai AS (
    SELECT f.user_id AS uid,
           round(sum(COALESCE((f.metadata->>'estimatedCostUsd')::numeric, 0)), 4) AS ai_cost_usd
    FROM public.function_logs f
    WHERE f.user_id IS NOT NULL
      AND f.created_at >= v_start AND f.created_at < v_end
    GROUP BY f.user_id
  ),
  combined AS (
    SELECT COALESCE(r.uid, a.uid) AS uid,
           r.wid,
           COALESCE(r.meetings, 0) AS meetings,
           COALESCE(r.bot_hours, 0) AS bot_hours,
           COALESCE(r.transcription_hours, 0) AS transcription_hours,
           COALESCE(r.recall_cost_usd, 0) AS recall_cost_usd,
           COALESCE(a.ai_cost_usd, 0) AS ai_cost_usd
    FROM recall r
    FULL OUTER JOIN ai a ON a.uid = r.uid
  )
  SELECT c.uid,
         COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS user_name,
         u.email::text,
         COALESCE(c.wid, w.id) AS workspace_id,
         w.name AS workspace_name,
         c.meetings,
         c.bot_hours,
         c.transcription_hours,
         c.recall_cost_usd,
         c.ai_cost_usd,
         round(c.recall_cost_usd + c.ai_cost_usd, 4) AS total_cost_usd
  FROM combined c
  LEFT JOIN auth.users u ON u.id = c.uid
  LEFT JOIN LATERAL (
    SELECT ws.id, ws.name
    FROM public.workspaces ws
    WHERE ws.owner_id = c.uid
       OR c.uid = ANY(COALESCE(ws.hr_admin_ids, ARRAY[]::uuid[]))
       OR EXISTS (SELECT 1 FROM public.teams t WHERE t.workspace_id = ws.id AND t.leader_user_id = c.uid)
    ORDER BY ws.created_at
    LIMIT 1
  ) w ON true
  ORDER BY total_cost_usd DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cost_report(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cost_report(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cost_report(DATE) TO service_role;