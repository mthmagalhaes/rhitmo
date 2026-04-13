
DROP FUNCTION IF EXISTS public.get_invite_details(uuid);

CREATE OR REPLACE FUNCTION public.get_invite_details(p_invite_token text)
 RETURNS TABLE(member_id uuid, member_name text, member_email text, workspace_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    tm.id as member_id,
    tm.name as member_name,
    tm.email as member_email,
    w.name as workspace_name
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE tm.invite_token = p_invite_token::uuid
    AND tm.invite_status = 'pending'
    AND w.is_active = true
$$;
