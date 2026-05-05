
-- RPC: semantic match over context_evidence (Context Graph) for the Mentor Chat RAG.
-- Uses SECURITY DEFINER so the edge function can call it with service_role,
-- but mirrors the same workspace/leader gating as match_feedbacks.

CREATE OR REPLACE FUNCTION public.match_context_evidence(
  query_embedding extensions.vector,
  match_threshold double precision DEFAULT 0.35,
  match_count integer DEFAULT 25,
  filter_member_id uuid DEFAULT NULL,
  filter_workspace_id uuid DEFAULT NULL,
  filter_evidence_types text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  member_id uuid,
  source_table text,
  source_id uuid,
  evidence_type text,
  occurred_at timestamp with time zone,
  title text,
  summary text,
  sentiment text,
  tags text[],
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.member_id,
    e.source_table,
    e.source_id,
    e.evidence_type,
    e.occurred_at,
    e.title,
    e.summary,
    e.sentiment,
    e.tags,
    (1 - (e.embedding <=> query_embedding))::double precision AS similarity
  FROM public.context_evidence e
  WHERE
    e.embedding IS NOT NULL
    AND (filter_member_id IS NULL OR e.member_id = filter_member_id)
    AND (filter_workspace_id IS NULL OR e.workspace_id = filter_workspace_id)
    AND (filter_evidence_types IS NULL OR e.evidence_type = ANY(filter_evidence_types))
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
