ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS type text DEFAULT 'mentor';
ALTER TABLE public.chat_threads ALTER COLUMN member_id DROP NOT NULL;