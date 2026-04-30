-- 1) Allow nullable member_id (mentor threads from leader without specific target)
ALTER TABLE public.chat_threads ALTER COLUMN member_id DROP NOT NULL;

-- 2) Extend type CHECK to include meu_rhitmo and brief
ALTER TABLE public.chat_threads DROP CONSTRAINT IF EXISTS chat_threads_type_check;
ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_type_check
  CHECK (type IN ('mentor', 'career', 'assistant', 'meu_rhitmo', 'brief'));

-- 3) Partial index for meu_rhitmo lookups (sidebar threads list)
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_meu_rhitmo
  ON public.chat_threads (user_id, updated_at DESC)
  WHERE type = 'meu_rhitmo';

-- 4) Partial index for mentor + brief lookups (leader sidebar threads)
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_leader_threads
  ON public.chat_threads (user_id, updated_at DESC)
  WHERE type IN ('mentor', 'brief');