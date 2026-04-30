-- Onda 3.2: Event Bus
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  workspace_id uuid,
  actor_user_id uuid,
  target_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  error text,
  CONSTRAINT events_status_check CHECK (status IN ('pending','dispatched','failed','skipped'))
);

CREATE INDEX IF NOT EXISTS idx_events_pending
  ON public.events(status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_events_workspace_type
  ON public.events(workspace_id, event_type, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin consegue ler/escrever via API client.
-- Edge functions usam service_role e bypassam RLS.
CREATE POLICY "Super admin full access on events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());