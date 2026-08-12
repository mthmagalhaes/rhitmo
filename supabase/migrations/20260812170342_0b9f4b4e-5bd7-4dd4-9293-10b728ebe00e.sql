ALTER TABLE public.note_taker_synced_notes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS attendees jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.note_taker_synced_notes
  DROP CONSTRAINT IF EXISTS note_taker_synced_notes_status_check;
ALTER TABLE public.note_taker_synced_notes
  ADD CONSTRAINT note_taker_synced_notes_status_check
  CHECK (status IN ('pending','imported','dismissed','seen'));

CREATE INDEX IF NOT EXISTS idx_note_taker_synced_notes_pending
  ON public.note_taker_synced_notes (user_id, provider, status);

GRANT SELECT ON public.note_taker_synced_notes TO authenticated;
GRANT ALL ON public.note_taker_synced_notes TO service_role;

DROP POLICY IF EXISTS "Leaders read own synced notes" ON public.note_taker_synced_notes;
CREATE POLICY "Leaders read own synced notes"
  ON public.note_taker_synced_notes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());