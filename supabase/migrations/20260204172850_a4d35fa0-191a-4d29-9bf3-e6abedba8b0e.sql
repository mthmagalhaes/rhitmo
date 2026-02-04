-- Rhitmo Sync 2.0: Novas colunas para dados comportamentais profundos

-- Dados demográficos e preferências expandidas
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS birth_year INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS chronotype TEXT,
ADD COLUMN IF NOT EXISTS feedback_style TEXT,
ADD COLUMN IF NOT EXISTS recognition_style TEXT,
ADD COLUMN IF NOT EXISTS motivators JSONB DEFAULT '[]'::jsonb;

-- Adicionar constraints
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_chronotype_check 
CHECK (chronotype IS NULL OR chronotype IN ('morning', 'commercial', 'night'));

ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_feedback_style_check 
CHECK (feedback_style IS NULL OR feedback_style IN ('direct', 'empathetic', 'written'));

ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_recognition_style_check 
CHECK (recognition_style IS NULL OR recognition_style IN ('public', 'private'));

-- Criar nova versão da função RPC para aceitar todos os novos dados
CREATE OR REPLACE FUNCTION public.submit_rhitmo_sync_v2(
  p_member_id UUID,
  p_birth_year INTEGER DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_chronotype TEXT DEFAULT NULL,
  p_feedback_style TEXT DEFAULT NULL,
  p_recognition_style TEXT DEFAULT NULL,
  p_motivators JSONB DEFAULT NULL,
  p_user_manual JSONB DEFAULT NULL,
  p_work_style_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só atualiza se work_style_data ainda for NULL (previne re-submissão)
  UPDATE public.team_members
  SET 
    birth_year = COALESCE(p_birth_year, birth_year),
    gender = COALESCE(p_gender, gender),
    chronotype = COALESCE(p_chronotype, chronotype),
    feedback_style = COALESCE(p_feedback_style, feedback_style),
    recognition_style = COALESCE(p_recognition_style, recognition_style),
    motivators = COALESCE(p_motivators, motivators),
    user_manual = COALESCE(p_user_manual, user_manual),
    work_style_data = COALESCE(p_work_style_data, work_style_data),
    updated_at = now()
  WHERE id = p_member_id
    AND work_style_data IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Garantir que anon e public podem executar
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2 TO public;
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2 TO anon;