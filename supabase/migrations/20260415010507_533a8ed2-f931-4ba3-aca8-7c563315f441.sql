ALTER TABLE public.recall_bots
ADD COLUMN leader_email TEXT,
ADD COLUMN leader_detected BOOLEAN NOT NULL DEFAULT false;