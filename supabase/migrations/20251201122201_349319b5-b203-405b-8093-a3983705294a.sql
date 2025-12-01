-- Adicionar coluna key_objectives à tabela team_members
ALTER TABLE public.team_members 
ADD COLUMN key_objectives TEXT;

COMMENT ON COLUMN public.team_members.key_objectives IS 
'Objetivos do período no formato: Objetivo | Valor | Prazo. Exemplo: Aumentar SQLs semanais | de 15 para 25 | até 31/out';