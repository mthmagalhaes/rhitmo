ALTER TABLE public.meeting_transcripts 
  ALTER COLUMN member_id DROP NOT NULL,
  ALTER COLUMN manager_id DROP NOT NULL;