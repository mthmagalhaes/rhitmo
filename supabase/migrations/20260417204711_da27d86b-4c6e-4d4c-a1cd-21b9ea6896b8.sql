CREATE OR REPLACE FUNCTION public.admin_funnel_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leads_total int;
  v_leads_invited int;
  v_signed_up int;
  v_workspace_created int;
  v_activated int;
  v_paid int;
  v_result jsonb;
BEGIN
  -- Only super-admins
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Stage 1: Total leads
  SELECT COUNT(*) INTO v_leads_total FROM public.waitlist_leads;

  -- Stage 2: Invited leads
  SELECT COUNT(*) INTO v_leads_invited
  FROM public.waitlist_leads
  WHERE status = 'invited';

  -- Stage 3: Signed up — auth.users that match a waitlist email
  -- (ou todos auth.users; aqui pegamos todos signups confirmados)
  SELECT COUNT(*) INTO v_signed_up
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL;

  -- Stage 4: Workspace created (active workspaces, distinct owners)
  SELECT COUNT(DISTINCT owner_id) INTO v_workspace_created
  FROM public.workspaces
  WHERE is_active = true;

  -- Stage 5: Activated — workspace with at least 1 feedback OR review OR transcript
  -- within 7 days of workspace creation
  SELECT COUNT(DISTINCT w.id) INTO v_activated
  FROM public.workspaces w
  WHERE w.is_active = true
    AND (
      EXISTS (
        SELECT 1 FROM public.feedbacks f
        JOIN public.team_members tm ON tm.id = f.member_id
        JOIN public.teams t ON t.id = tm.team_id
        WHERE t.workspace_id = w.id
          AND f.created_at <= w.created_at + INTERVAL '7 days'
      )
      OR EXISTS (
        SELECT 1 FROM public.performance_reviews pr
        JOIN public.team_members tm ON tm.id = pr.member_id
        JOIN public.teams t ON t.id = tm.team_id
        WHERE t.workspace_id = w.id
          AND pr.created_at <= w.created_at + INTERVAL '7 days'
      )
      OR EXISTS (
        SELECT 1 FROM public.meeting_transcripts mt
        JOIN public.team_members tm ON tm.id = mt.member_id
        JOIN public.teams t ON t.id = tm.team_id
        WHERE t.workspace_id = w.id
          AND mt.created_at <= w.created_at + INTERVAL '7 days'
      )
    );

  -- Stage 6: Paying customers
  SELECT COUNT(*) INTO v_paid
  FROM public.subscriptions
  WHERE status IN ('active', 'trialing')
    AND plan_tier IN ('pro', 'business');

  v_result := jsonb_build_object(
    'leads_total', v_leads_total,
    'leads_invited', v_leads_invited,
    'signed_up', v_signed_up,
    'workspace_created', v_workspace_created,
    'activated', v_activated,
    'paid', v_paid,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_funnel_metrics() TO authenticated;