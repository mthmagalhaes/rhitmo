-- Cache de briefings executivos por liderado/janela
CREATE TABLE public.context_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  leader_user_id uuid NOT NULL,
  window_days int NOT NULL DEFAULT 7 CHECK (window_days IN (7, 14, 30)),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  wins jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  in_motion jsonb NOT NULL DEFAULT '[]'::jsonb,
  conversations jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_count int NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model text,
  UNIQUE (member_id, window_days, window_start)
);

CREATE INDEX idx_context_briefs_leader ON public.context_briefs (leader_user_id, generated_at DESC);
CREATE INDEX idx_context_briefs_member ON public.context_briefs (member_id, window_days, generated_at DESC);

ALTER TABLE public.context_briefs ENABLE ROW LEVEL SECURITY;

-- Líder dono vê e gerencia seus próprios briefings
CREATE POLICY "Leaders read own briefs"
  ON public.context_briefs FOR SELECT
  TO authenticated
  USING (leader_user_id = auth.uid());

CREATE POLICY "Leaders insert own briefs"
  ON public.context_briefs FOR INSERT
  TO authenticated
  WITH CHECK (leader_user_id = auth.uid());

CREATE POLICY "Leaders update own briefs"
  ON public.context_briefs FOR UPDATE
  TO authenticated
  USING (leader_user_id = auth.uid())
  WITH CHECK (leader_user_id = auth.uid());

CREATE POLICY "Leaders delete own briefs"
  ON public.context_briefs FOR DELETE
  TO authenticated
  USING (leader_user_id = auth.uid());