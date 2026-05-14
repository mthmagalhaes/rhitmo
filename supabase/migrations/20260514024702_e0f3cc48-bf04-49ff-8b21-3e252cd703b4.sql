
-- ============================================================
-- 1) RPC: claim_team_member_by_email
-- Vincula automaticamente um team_members "órfão" (linked_user_id IS NULL,
-- invite_status != 'accepted') ao user recém criado, baseado no e-mail.
-- Retorna o number de registros vinculados.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_team_member_by_email(
  p_user_id uuid,
  p_email text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_user_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN 0;
  END IF;

  -- Vincula registros de team_members que combinam com o email do user
  -- e ainda não estão vinculados a ninguém.
  -- Idempotente: se já estiver vinculado a este user, no-op.
  WITH updated AS (
    UPDATE public.team_members
       SET linked_user_id = p_user_id,
           invite_status  = 'accepted',
           invite_token   = NULL,
           updated_at     = now()
     WHERE lower(email) = lower(trim(p_email))
       AND linked_user_id IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_team_member_by_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_team_member_by_email(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.claim_team_member_by_email(uuid, text) IS
'Auto-vincula team_members órfãos (mesmo e-mail, sem linked_user_id) ao usuário autenticado. Chamada client-side após signup ou no carregamento da app para destravar liderados que criaram conta sem passar pelo /invite com token.';

-- ============================================================
-- 2) Trigger: garantir time default ao criar workspace
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_default_team_after_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cria team default só se ainda não existir nenhum para esse workspace.
  IF NOT EXISTS (
    SELECT 1 FROM public.teams WHERE workspace_id = NEW.id
  ) THEN
    INSERT INTO public.teams (workspace_id, name, leader_user_id)
    VALUES (NEW.id, 'Sem Time', NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspace_default_team ON public.workspaces;
CREATE TRIGGER trg_workspace_default_team
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_team_after_workspace();

COMMENT ON TRIGGER trg_workspace_default_team ON public.workspaces IS
'Rede de segurança: garante que todo workspace recém criado tenha o time "Sem Time" pré-existente, caso o insert via UI falhe.';
