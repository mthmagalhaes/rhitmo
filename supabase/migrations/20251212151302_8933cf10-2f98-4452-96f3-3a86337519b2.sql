-- Função RPC para submissão do Rhitmo Sync via link público
-- SECURITY DEFINER permite que usuários anônimos atualizem work_style_data
CREATE OR REPLACE FUNCTION public.submit_rhitmo_sync(
  p_member_id UUID,
  p_work_style_data JSONB
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
    work_style_data = p_work_style_data,
    updated_at = now()
  WHERE id = p_member_id
    AND work_style_data IS NULL;
  
  -- Retorna TRUE se atualizou, FALSE se não encontrou ou já preenchido
  RETURN FOUND;
END;
$$;

-- Permitir execução por usuários anônimos
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync(UUID, JSONB) TO public;
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync(UUID, JSONB) TO anon;