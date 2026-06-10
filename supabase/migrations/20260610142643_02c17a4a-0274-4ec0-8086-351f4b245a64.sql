-- Sprint 1 / G7: trigger para popular teams.leader_user_id automaticamente
-- quando o "primeiro líder" de um time (cadastrado pelo HR Admin onboarding)
-- finalmente cria a conta e tem linked_user_id populado.
--
-- Condições conservadoras pra evitar promover liderado comum:
--   1. linked_user_id transita de NULL -> UUID
--   2. role do team_members indica liderança ('Líder', 'Lider', 'leader', 'Leader')
--   3. o teams correspondente está SEM leader_user_id (NULL)
--
-- Idempotente — se algo já está populado, no-op.

CREATE OR REPLACE FUNCTION public.auto_promote_leader_on_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.linked_user_id IS NULL
     AND NEW.linked_user_id IS NOT NULL
     AND NEW.team_id IS NOT NULL
     AND COALESCE(NEW.role, '') ~* '^(líder|lider|leader)$'
  THEN
    UPDATE public.teams
       SET leader_user_id = NEW.linked_user_id
     WHERE id = NEW.team_id
       AND leader_user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_promote_leader_on_link ON public.team_members;
CREATE TRIGGER trg_auto_promote_leader_on_link
  AFTER UPDATE OF linked_user_id ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_leader_on_link();

COMMENT ON FUNCTION public.auto_promote_leader_on_link() IS
'Promove automaticamente team_members marcado com role=Líder a teams.leader_user_id quando ele vincula a conta. Resolve gap G7: times órfãos criados via create_hr_admin_starter_workspace.';