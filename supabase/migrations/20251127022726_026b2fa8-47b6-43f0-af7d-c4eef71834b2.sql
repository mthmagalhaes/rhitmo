-- Adicionar coluna email à tabela team_members
ALTER TABLE public.team_members ADD COLUMN email TEXT;

-- Criar índice para melhor performance nas buscas por email
CREATE INDEX idx_team_members_email ON public.team_members(email);