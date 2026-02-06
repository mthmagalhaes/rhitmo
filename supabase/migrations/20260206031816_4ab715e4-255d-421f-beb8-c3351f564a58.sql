-- Drop existing function and recreate with new return type including member_email
DROP FUNCTION IF EXISTS public.get_invite_details(uuid);

CREATE OR REPLACE FUNCTION public.get_invite_details(p_invite_token uuid)
RETURNS TABLE(
  member_id uuid,
  member_name text,
  member_email text,
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
    tm.email as member_email,
    w.name as workspace_name
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE tm.invite_token = p_invite_token
    AND tm.invite_status = 'pending'
    AND w.is_active = true
$$;

-- Grant execute to public roles for invite flow
GRANT EXECUTE ON FUNCTION public.get_invite_details(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_details(uuid) TO authenticated;