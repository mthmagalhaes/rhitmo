-- 1. competency_templates: explicit admin-only write policies (was fail-closed/implicit)
CREATE POLICY "Admins can insert templates"
  ON public.competency_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update templates"
  ON public.competency_templates FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete templates"
  ON public.competency_templates FOR DELETE TO authenticated
  USING (public.is_admin());

-- 2. team_members: replace fragile self-update WITH CHECK subqueries with a trigger guard
CREATE OR REPLACE FUNCTION public.tm_guard_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Privileged actors (team leader chain, HR/Owner, super admin) may change anything
  IF public.is_admin() OR public.rls_check_member_access(OLD.team_id) THEN
    RETURN NEW;
  END IF;

  -- Otherwise this is a self-update by the linked member: freeze privileged columns
  IF NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.linked_user_id IS DISTINCT FROM OLD.linked_user_id
     OR COALESCE(NEW.role, '') IS DISTINCT FROM COALESCE(OLD.role, '')
     OR NEW.performance_score IS DISTINCT FROM OLD.performance_score
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.archived_by IS DISTINCT FROM OLD.archived_by
  THEN
    RAISE EXCEPTION 'Você não pode alterar cargo, performance, time ou arquivamento do seu próprio cadastro';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tm_guard_self_update_trg ON public.team_members;
CREATE TRIGGER tm_guard_self_update_trg
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.tm_guard_self_update();

DROP POLICY IF EXISTS "tm_update" ON public.team_members;
CREATE POLICY "tm_update"
  ON public.team_members FOR UPDATE TO authenticated
  USING (
    public.rls_check_member_access(team_id)
    OR linked_user_id = public.effective_user_id()
    OR public.is_admin()
  )
  WITH CHECK (
    public.rls_check_member_access(team_id)
    OR linked_user_id = public.effective_user_id()
    OR public.is_admin()
  );
