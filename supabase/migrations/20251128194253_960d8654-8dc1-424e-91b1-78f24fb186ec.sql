-- Adicionar coluna para dados do estilo de trabalho
ALTER TABLE public.team_members 
ADD COLUMN work_style_data JSONB DEFAULT NULL;

-- Criar índice para melhor performance em consultas JSON
CREATE INDEX idx_team_members_work_style_data ON public.team_members USING GIN (work_style_data);

-- Criar política RLS para permitir UPDATE público apenas no campo work_style_data
-- Isso permite que o liderado preencha seus dados sem login
CREATE POLICY "Liderados podem preencher work_style_data via link" 
ON public.team_members 
FOR UPDATE 
TO anon
USING (work_style_data IS NULL)
WITH CHECK (work_style_data IS NULL);