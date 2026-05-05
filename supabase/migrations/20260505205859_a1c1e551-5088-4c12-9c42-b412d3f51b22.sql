ALTER TABLE public.mentor_messages
  ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_threads_user_pinned_updated
  ON public.chat_threads(user_id, is_pinned DESC, updated_at DESC);