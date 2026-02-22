
-- =============================================
-- GRUPO B: Revogar anon + adicionar auth.uid() check
-- =============================================

-- 1. match_feedbacks
CREATE OR REPLACE FUNCTION public.match_feedbacks(
  query_embedding extensions.vector,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 10,
  filter_member_id uuid DEFAULT NULL::uuid,
  filter_workspace_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(id uuid, member_id uuid, content text, summary text, type text, created_at timestamp with time zone, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    f.id,
    f.member_id,
    f.content,
    f.summary,
    f.type,
    f.created_at,
    (1 - (f.embedding <=> query_embedding))::double precision AS similarity
  FROM public.feedbacks f
  JOIN public.team_members tm ON tm.id = f.member_id
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE 
    f.embedding IS NOT NULL
    AND (filter_member_id IS NULL OR f.member_id = filter_member_id)
    AND (filter_workspace_id IS NULL OR w.id = filter_workspace_id)
    AND (1 - (f.embedding <=> query_embedding)) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.match_feedbacks(extensions.vector, double precision, integer, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_feedbacks(extensions.vector, double precision, integer, uuid, uuid) TO authenticated;

-- 2. get_all_users_with_metadata
CREATE OR REPLACE FUNCTION public.get_all_users_with_metadata()
RETURNS TABLE(user_id uuid, email text, full_name text, phone text, job_title text, team_size text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    au.id as user_id,
    au.email::text,
    (au.raw_user_meta_data->>'full_name')::text as full_name,
    (au.raw_user_meta_data->>'phone')::text as phone,
    (au.raw_user_meta_data->>'job_title')::text as job_title,
    (au.raw_user_meta_data->>'team_size')::text as team_size,
    au.created_at
  FROM auth.users au
  WHERE public.is_admin() = true
  ORDER BY au.created_at DESC
$function$;

REVOKE EXECUTE ON FUNCTION public.get_all_users_with_metadata() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_metadata() TO authenticated;

-- 3. update_member_own_data
CREATE OR REPLACE FUNCTION public.update_member_own_data(
  p_work_style_data jsonb DEFAULT NULL::jsonb,
  p_skills_data jsonb DEFAULT NULL::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.team_members
  SET 
    work_style_data = COALESCE(p_work_style_data, work_style_data),
    skills_data = COALESCE(p_skills_data, skills_data),
    updated_at = now()
  WHERE linked_user_id = auth.uid();
  RETURN FOUND;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_member_own_data(jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_member_own_data(jsonb, jsonb) TO authenticated;

-- =============================================
-- GRUPO C: Apenas revogar anon (helpers de RLS)
-- =============================================

-- effective_user_id
REVOKE EXECUTE ON FUNCTION public.effective_user_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.effective_user_id() TO authenticated;

-- is_admin
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- check_is_admin
REVOKE EXECUTE ON FUNCTION public.check_is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

-- is_workspace_owner
REVOKE EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) TO authenticated;

-- user_owns_team
REVOKE EXECUTE ON FUNCTION public.user_owns_team(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_owns_team(uuid, uuid) TO authenticated;

-- user_is_linked_member
REVOKE EXECUTE ON FUNCTION public.user_is_linked_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_is_linked_member(uuid, uuid) TO authenticated;

-- workspace_is_active
REVOKE EXECUTE ON FUNCTION public.workspace_is_active(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.workspace_is_active(uuid) TO authenticated;

-- can_update_own_sync
REVOKE EXECUTE ON FUNCTION public.can_update_own_sync(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_update_own_sync(uuid) TO authenticated;

-- update_updated_at_column (trigger function)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
