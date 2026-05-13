DROP FUNCTION IF EXISTS public.get_member_for_sync(uuid);

CREATE FUNCTION public.get_member_for_sync(p_member_id uuid)
RETURNS TABLE(id uuid, name text, role text, work_style_data jsonb, linked_user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, name, role, work_style_data, linked_user_id
  FROM public.team_members
  WHERE id = p_member_id
$function$;

DELETE FROM public.team_members
WHERE id = 'd11bd4d8-9853-428c-b2fb-2f0aaf8779f0'
  AND linked_user_id IS NULL
  AND work_style_data IS NULL;