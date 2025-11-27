-- Criar tabela de membros da equipe
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  performance_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de feedbacks
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('positive', 'constructive', 'neutral')),
  summary TEXT,
  sentiment TEXT,
  coaching_tips TEXT,
  bias_alert TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies para team_members
CREATE POLICY "Gerentes podem ver seus liderados"
  ON public.team_members
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gerentes podem criar liderados"
  ON public.team_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gerentes podem atualizar seus liderados"
  ON public.team_members
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Gerentes podem deletar seus liderados"
  ON public.team_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para feedbacks
CREATE POLICY "Gerentes podem ver seus feedbacks"
  ON public.feedbacks
  FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Gerentes podem criar feedbacks"
  ON public.feedbacks
  FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Gerentes podem atualizar seus feedbacks"
  ON public.feedbacks
  FOR UPDATE
  USING (auth.uid() = manager_id);

CREATE POLICY "Gerentes podem deletar seus feedbacks"
  ON public.feedbacks
  FOR DELETE
  USING (auth.uid() = manager_id);

-- Criar índices para melhor performance
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_feedbacks_manager_id ON public.feedbacks(manager_id);
CREATE INDEX idx_feedbacks_member_id ON public.feedbacks(member_id);
CREATE INDEX idx_feedbacks_created_at ON public.feedbacks(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();