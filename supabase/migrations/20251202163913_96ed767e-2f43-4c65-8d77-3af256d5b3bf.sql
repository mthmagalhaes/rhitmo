-- Criar tabela para persistir mensagens do mentor
CREATE TABLE public.mentor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX idx_mentor_messages_user_id ON public.mentor_messages(user_id);
CREATE INDEX idx_mentor_messages_member_id ON public.mentor_messages(member_id);
CREATE INDEX idx_mentor_messages_created_at ON public.mentor_messages(created_at DESC);

-- Políticas RLS: usuário só vê/cria suas próprias mensagens
CREATE POLICY "Users can view own mentor messages"
  ON public.mentor_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mentor messages"
  ON public.mentor_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mentor messages"
  ON public.mentor_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin tem acesso total
CREATE POLICY "Admin Full Access"
  ON public.mentor_messages FOR ALL
  TO authenticated
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);