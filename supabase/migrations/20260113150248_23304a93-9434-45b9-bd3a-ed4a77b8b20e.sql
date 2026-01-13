-- =====================================================
-- 1. Criar tabela chat_threads
-- =====================================================
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova Conversa',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_chat_threads_member_id ON public.chat_threads(member_id);
CREATE INDEX idx_chat_threads_user_id ON public.chat_threads(user_id);
CREATE INDEX idx_chat_threads_updated_at ON public.chat_threads(updated_at DESC);

-- RLS Policies
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own threads"
ON public.chat_threads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own threads"
ON public.chat_threads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads"
ON public.chat_threads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads"
ON public.chat_threads FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_chat_threads_updated_at
BEFORE UPDATE ON public.chat_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. Adicionar thread_id na tabela mentor_messages
-- =====================================================
ALTER TABLE public.mentor_messages 
ADD COLUMN thread_id uuid REFERENCES public.chat_threads(id) ON DELETE CASCADE;

CREATE INDEX idx_mentor_messages_thread_id ON public.mentor_messages(thread_id);

-- =====================================================
-- 3. Migrar mensagens existentes para thread "Histórico Inicial"
-- =====================================================

-- Criar threads "Histórico Inicial" para cada combinação user_id + member_id existente
INSERT INTO public.chat_threads (id, user_id, member_id, title, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  user_id,
  member_id,
  'Histórico Inicial',
  MIN(created_at),
  MAX(created_at)
FROM public.mentor_messages
WHERE thread_id IS NULL
GROUP BY user_id, member_id;

-- Atualizar mensagens existentes com o thread_id correspondente
UPDATE public.mentor_messages mm
SET thread_id = ct.id
FROM public.chat_threads ct
WHERE mm.user_id = ct.user_id 
  AND mm.member_id = ct.member_id
  AND mm.thread_id IS NULL
  AND ct.title = 'Histórico Inicial';