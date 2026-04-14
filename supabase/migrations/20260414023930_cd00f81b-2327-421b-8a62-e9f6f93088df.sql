
CREATE OR REPLACE FUNCTION public.get_sync_notification_data(p_member_id uuid)
RETURNS TABLE (
  member_name text,
  leader_name text,
  leader_email text,
  team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tm.name AS member_name,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) AS leader_name,
    au.email AS leader_email,
    t.name AS team_name
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN auth.users au ON au.id = t.leader_user_id
  WHERE tm.id = p_member_id
    AND t.leader_user_id IS NOT NULL
  LIMIT 1;
$$;
