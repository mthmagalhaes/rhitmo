CREATE TABLE IF NOT EXISTS public.network_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  leader_user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('isolate', 'super_connector', 'pattern_drop', 'pattern_spike')),
  window_days int NOT NULL CHECK (window_days IN (30, 60, 90)),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'watch', 'attention')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  detected_on date GENERATED ALWAYS AS ((detected_at AT TIME ZONE 'UTC')::date) STORED,
  acknowledged_at timestamptz NULL,
  acknowledged_by uuid NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS network_signals_dedup_idx
  ON public.network_signals (leader_user_id, member_id, signal_type, window_days, detected_on);

CREATE INDEX IF NOT EXISTS network_signals_leader_active_idx
  ON public.network_signals (leader_user_id, detected_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS network_signals_workspace_idx
  ON public.network_signals (workspace_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS network_signals_member_idx
  ON public.network_signals (member_id, detected_at DESC);

ALTER TABLE public.network_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY network_signals_select
  ON public.network_signals
  FOR SELECT
  TO authenticated
  USING (
    leader_user_id = effective_user_id()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = network_signals.workspace_id
        AND w.is_active = true
        AND (
          w.owner_id = effective_user_id()
          OR effective_user_id() = ANY (COALESCE(w.hr_admin_ids, '{}'::uuid[]))
        )
    )
    OR (
      severity = 'info'
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = network_signals.member_id
          AND tm.linked_user_id = auth.uid()
      )
    )
  );

CREATE POLICY network_signals_service_insert
  ON public.network_signals FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY network_signals_service_delete
  ON public.network_signals FOR DELETE TO service_role USING (true);

CREATE POLICY network_signals_leader_ack
  ON public.network_signals
  FOR UPDATE
  TO authenticated
  USING (leader_user_id = effective_user_id())
  WITH CHECK (leader_user_id = effective_user_id());

CREATE POLICY network_signals_service_update
  ON public.network_signals FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_team_pulse(_window_days int DEFAULT 30)
RETURNS TABLE (
  id uuid,
  member_id uuid,
  member_name text,
  signal_type text,
  severity text,
  payload jsonb,
  detected_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.member_id, tm.name, s.signal_type, s.severity, s.payload, s.detected_at
  FROM public.network_signals s
  JOIN public.team_members tm ON tm.id = s.member_id
  WHERE s.leader_user_id = auth.uid()
    AND s.window_days = _window_days
    AND s.acknowledged_at IS NULL
  ORDER BY
    CASE s.severity WHEN 'attention' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END,
    s.detected_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_pulse(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.acknowledge_network_signal(_signal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE public.network_signals
  SET acknowledged_at = now(), acknowledged_by = auth.uid()
  WHERE id = _signal_id
    AND leader_user_id = auth.uid()
    AND acknowledged_at IS NULL;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_network_signal(uuid) TO authenticated;
