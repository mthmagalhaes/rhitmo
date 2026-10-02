CREATE TABLE public.connector_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL CHECK (char_length(connector_id) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT ON public.connector_interest TO authenticated;
GRANT ALL ON public.connector_interest TO service_role;
ALTER TABLE public.connector_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own interest read" ON public.connector_interest FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own interest insert" ON public.connector_interest FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());