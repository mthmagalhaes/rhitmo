
DROP FUNCTION IF EXISTS public.get_member_for_sync(uuid);

CREATE FUNCTION public.get_member_for_sync(p_member_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  role text,
  email text,
  work_style_data jsonb,
  linked_user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.id, tm.name, tm.role, tm.email, tm.work_style_data, tm.linked_user_id
    FROM public.team_members tm
   WHERE tm.id = p_member_id
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_member_for_sync(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_for_sync(uuid) TO anon, authenticated;
