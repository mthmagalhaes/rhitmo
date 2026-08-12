CREATE TABLE public.leader_note_taker_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'granola',
  api_key_ciphertext text NOT NULL,
  account_label text,
  last_synced_at timestamptz,
  last_cursor text,
  last_error text,
  notes_imported integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

GRANT SELECT, DELETE ON public.leader_note_taker_connections TO authenticated;
GRANT ALL ON public.leader_note_taker_connections TO service_role;

ALTER TABLE public.leader_note_taker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note taker connection"
ON public.leader_note_taker_connections FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own note taker connection"
ON public.leader_note_taker_connections FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_leader_note_taker_connections_updated_at
BEFORE UPDATE ON public.leader_note_taker_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.note_taker_synced_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'granola',
  external_note_id text NOT NULL,
  feedback_id uuid,
  member_id uuid,
  title text,
  note_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, external_note_id)
);

GRANT SELECT ON public.note_taker_synced_notes TO authenticated;
GRANT ALL ON public.note_taker_synced_notes TO service_role;

ALTER TABLE public.note_taker_synced_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own synced notes"
ON public.note_taker_synced_notes FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_note_taker_synced_notes_user ON public.note_taker_synced_notes(user_id, provider);