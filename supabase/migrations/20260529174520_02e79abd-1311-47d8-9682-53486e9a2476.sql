-- Add editable fields for slack_activity_rollup evidences
ALTER TABLE public.context_evidence
  ADD COLUMN IF NOT EXISTS leader_edited_summary text NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_context_evidence_deleted_at
  ON public.context_evidence (deleted_at)
  WHERE deleted_at IS NULL;

-- Allow leader (manager of the member) to UPDATE only slack_activity_rollup rows.
-- The existing policies only had SELECT; UPDATE/DELETE were blocked.
DROP POLICY IF EXISTS "context_evidence_leader_update_slack_rollup" ON public.context_evidence;
CREATE POLICY "context_evidence_leader_update_slack_rollup"
  ON public.context_evidence
  FOR UPDATE
  TO authenticated
  USING (
    evidence_type = 'slack_activity_rollup'
    AND is_team_leader(effective_user_id(), member_id)
  )
  WITH CHECK (
    evidence_type = 'slack_activity_rollup'
    AND is_team_leader(effective_user_id(), member_id)
  );

DROP POLICY IF EXISTS "context_evidence_leader_soft_delete_slack_rollup" ON public.context_evidence;
-- Soft delete is performed via UPDATE deleted_at, so the UPDATE policy above already covers it.
-- We do NOT add a real DELETE policy: rows stay in the table for audit/RAG continuity.