
CREATE TABLE public.leader_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL,
  member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  severity TEXT DEFAULT 'info',
  dismissed_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nudges_leader ON public.leader_nudges(leader_id, dismissed_at);
CREATE INDEX idx_nudges_created ON public.leader_nudges(created_at DESC);

ALTER TABLE public.leader_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view their nudges"
  ON public.leader_nudges FOR SELECT
  TO authenticated
  USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can dismiss nudges"
  ON public.leader_nudges FOR UPDATE
  TO authenticated
  USING (auth.uid() = leader_id)
  WITH CHECK (auth.uid() = leader_id);
