-- Onda 2: Invariantes de schema para chat_threads e mentor_messages
-- Backfill defensivo (no-op esperado)
UPDATE public.chat_threads SET type = 'mentor' WHERE type IS NULL;

-- NOT NULL constraints
ALTER TABLE public.chat_threads
  ALTER COLUMN member_id SET NOT NULL,
  ALTER COLUMN type SET NOT NULL;

-- CHECK constraint para type (imutável - safe)
ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_type_check
    CHECK (type IN ('mentor', 'career', 'assistant'));

ALTER TABLE public.mentor_messages
  ALTER COLUMN thread_id SET NOT NULL;

-- Indices compostos para hot paths (listagem de threads + leitura de mensagens)
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_member_updated
  ON public.chat_threads(user_id, member_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_messages_thread_created
  ON public.mentor_messages(thread_id, created_at ASC);