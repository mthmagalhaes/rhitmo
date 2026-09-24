ALTER TABLE public.note_taker_synced_notes
  ADD COLUMN IF NOT EXISTS auto_assigned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suggested_member_id uuid;