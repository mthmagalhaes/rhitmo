
CREATE TABLE public.bias_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL,
  member_id UUID,
  bias_type TEXT NOT NULL,
  detected_words TEXT[] DEFAULT '{}',
  dismissed BOOLEAN DEFAULT false,
  context TEXT DEFAULT 'review',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bias_detections_leader ON public.bias_detections(leader_id);
CREATE INDEX idx_bias_detections_type ON public.bias_detections(bias_type);

ALTER TABLE public.bias_detections ENABLE ROW LEVEL SECURITY;

-- Leaders can insert their own detections
CREATE POLICY "Leaders can insert own bias detections"
  ON public.bias_detections FOR INSERT
  TO authenticated
  WITH CHECK (leader_id = auth.uid());

-- HR Admins can view bias detections for their workspace members
CREATE POLICY "HR Admins can view bias detections"
  ON public.bias_detections FOR SELECT
  TO authenticated
  USING (
    leader_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE tm.id = bias_detections.member_id
      AND public.is_hr_admin_of_workspace(w.id)
    )
  );

-- Leaders can update their own detections (for dismissed flag)
CREATE POLICY "Leaders can update own bias detections"
  ON public.bias_detections FOR UPDATE
  TO authenticated
  USING (leader_id = auth.uid());
