
DROP FUNCTION IF EXISTS public.get_review_evidence(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_review_evidence(
  _member_id UUID,
  _period_start DATE,
  _period_end DATE
)
RETURNS TABLE (
  feedbacks_count INTEGER,
  meetings_count INTEGER,
  total_evidence_count INTEGER,
  feedbacks JSONB,
  meetings JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_feedbacks JSONB;
  v_meetings JSONB;
  v_count_feedbacks INTEGER;
  v_count_meetings INTEGER;
  v_workspace_id UUID;
BEGIN
  -- Find workspace for this member
  SELECT t.workspace_id INTO v_workspace_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.id = _member_id;

  -- Auth check: caller must own the member's workspace or be HR admin
  IF NOT (
    public.is_workspace_owner(effective_user_id(), _member_id) 
    OR public.is_admin()
    OR (v_workspace_id IS NOT NULL AND public.is_hr_admin_of_workspace(v_workspace_id))
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Feedbacks (anotações) in period
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'date', f.occurred_at,
        'content_preview', LEFT(f.content, 150),
        'sentiment', f.sentiment,
        'tags', f.tags,
        'type', f.type
      ) ORDER BY f.occurred_at DESC
    ), '[]'::JSONB)
  INTO v_count_feedbacks, v_feedbacks
  FROM feedbacks f
  WHERE f.member_id = _member_id
    AND f.occurred_at::DATE BETWEEN _period_start AND _period_end;

  -- Meeting transcripts in period
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mt.id,
        'date', mt.created_at,
        'leader_notes_preview', LEFT(mt.leader_notes, 150),
        'duration_seconds', mt.duration_seconds,
        'themes', mt.extracted_themes
      ) ORDER BY mt.created_at DESC
    ), '[]'::JSONB)
  INTO v_count_meetings, v_meetings
  FROM meeting_transcripts mt
  WHERE mt.member_id = _member_id
    AND mt.created_at::DATE BETWEEN _period_start AND _period_end
    AND mt.processing_status = 'completed';

  RETURN QUERY
  SELECT
    COALESCE(v_count_feedbacks, 0),
    COALESCE(v_count_meetings, 0),
    COALESCE(v_count_feedbacks, 0) + COALESCE(v_count_meetings, 0),
    v_feedbacks,
    v_meetings;
END;
$$;

-- Revoke anon/public, grant authenticated only
REVOKE EXECUTE ON FUNCTION public.get_review_evidence(uuid, date, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_review_evidence(uuid, date, date) TO authenticated;
