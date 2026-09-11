CREATE OR REPLACE FUNCTION public.can_view_network_pair(
  _workspace_id uuid,
  _member_a uuid,
  _member_b uuid,
  _strict boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  is_owner boolean;
  leader_a boolean := false;
  leader_b boolean := false;
  member_self_a boolean := false;
  member_self_b boolean := false;
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  uid := public.effective_user_id();
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id
      AND w.is_active = true
      AND w.owner_id = uid
  ) INTO is_owner;
  IF is_owner THEN RETURN true; END IF;

  IF public.is_hr_admin_of_workspace(_workspace_id) THEN
    RETURN true;
  END IF;

  IF _member_a IS NOT NULL THEN
    leader_a := public.is_team_leader(uid, _member_a);
  END IF;
  IF _member_b IS NOT NULL THEN
    leader_b := public.is_team_leader(uid, _member_b);
  END IF;

  IF (leader_a OR _member_a IS NULL) AND (leader_b OR _member_b IS NULL)
     AND (leader_a OR leader_b) THEN
    RETURN true;
  END IF;

  IF _member_a IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = _member_a AND tm.linked_user_id = auth.uid()
    ) INTO member_self_a;
  END IF;
  IF _member_b IS NOT NULL AND NOT member_self_a THEN
    SELECT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = _member_b AND tm.linked_user_id = auth.uid()
    ) INTO member_self_b;
  END IF;

  RETURN member_self_a OR member_self_b;
END;
$$;

CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  member_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_audit_log_ws_created_idx
  ON public.access_audit_log (workspace_id, created_at DESC);

GRANT SELECT ON public.access_audit_log TO authenticated;
GRANT ALL ON public.access_audit_log TO service_role;

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_audit_log_select ON public.access_audit_log;
CREATE POLICY access_audit_log_select
  ON public.access_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_hr_admin_of_workspace(workspace_id)
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = access_audit_log.workspace_id
        AND w.owner_id = public.effective_user_id()
    )
  );

DROP POLICY IF EXISTS access_audit_log_service_write ON public.access_audit_log;
CREATE POLICY access_audit_log_service_write
  ON public.access_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_access_event(
  _workspace_id uuid,
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL,
  _member_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR _workspace_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.access_audit_log (
    workspace_id, actor_user_id, actor_email, action,
    resource_type, resource_id, member_id, metadata
  )
  VALUES (
    _workspace_id,
    uid,
    (SELECT email FROM auth.users WHERE id = uid),
    _action,
    _resource_type,
    _resource_id,
    _member_id,
    COALESCE(_metadata, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_access_event(uuid, text, text, uuid, uuid, jsonb) TO authenticated;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS transcript_retention_days integer NOT NULL DEFAULT 365;