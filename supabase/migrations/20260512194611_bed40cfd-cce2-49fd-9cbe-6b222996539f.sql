ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS slack_conversation_id uuid;

ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS chat_threads_source_check;

ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_source_check CHECK (source IN ('web', 'slack'));

CREATE INDEX IF NOT EXISTS idx_chat_threads_user_source_updated
  ON public.chat_threads (user_id, source, updated_at DESC);