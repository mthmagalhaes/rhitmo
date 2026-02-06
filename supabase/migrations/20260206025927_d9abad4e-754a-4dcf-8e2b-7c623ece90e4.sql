-- RPC function to get invite details (public access via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_invite_token uuid)
RETURNS TABLE(
  member_id uuid,
  member_name text,
  workspace_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tm.id as member_id,
    tm.name as member_name,
    w.name as workspace_name
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE tm.invite_token = p_invite_token
    AND tm.invite_status = 'pending'
    AND w.is_active = true
$$;

-- Grant execute to public (for unauthenticated access)
GRANT EXECUTE ON FUNCTION public.get_invite_details(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_details(uuid) TO authenticated;