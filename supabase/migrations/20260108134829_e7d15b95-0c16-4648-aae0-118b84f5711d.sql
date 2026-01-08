-- Fix match_feedbacks function: add 'extensions' to search_path so <=> operator is found
CREATE OR REPLACE FUNCTION public.match_feedbacks(
  query_embedding extensions.vector, 
  match_threshold double precision DEFAULT 0.5, 
  match_count integer DEFAULT 10, 
  filter_member_id uuid DEFAULT NULL::uuid, 
  filter_workspace_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid, 
  member_id uuid, 
  content text, 
  summary text, 
  type text, 
  created_at timestamp with time zone, 
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
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