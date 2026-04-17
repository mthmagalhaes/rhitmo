-- ─────────────────────────────────────────────────────────────────────
-- 1. Helper function: is workspace owner of the member's workspace?
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_workspace_owner_of_member(_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = _member_id
      AND w.owner_id = effective_user_id()
      AND w.is_active = true
  )
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Remove the unused 'support' role from app_role enum
-- Postgres can't drop enum values directly when they may be referenced,
-- so we recreate the enum cleanly.
-- ─────────────────────────────────────────────────────────────────────

-- Defensive: delete any rows still using 'support' (should be zero)
DELETE FROM public.user_roles WHERE role = 'support';

-- Update is_admin_user to drop the 'support' check
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  );
$$;

-- Recreate the enum without 'support'
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('super_admin');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING role::text::public.app_role;

DROP TYPE public.app_role_old;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Owner-sees-all: extend RLS on feedbacks, meetings, goals, PDIs
-- ─────────────────────────────────────────────────────────────────────

-- ── feedbacks ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Leaders can view own feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders or workspace owner can view feedbacks"
ON public.feedbacks FOR SELECT
USING (
  effective_user_id() = manager_id
  OR public.is_workspace_owner_of_member(member_id)
);

-- ── meeting_transcripts ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Leaders can view own meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders or workspace owner can view meeting transcripts"
ON public.meeting_transcripts FOR SELECT
USING (
  manager_id = effective_user_id()
  OR (member_id IS NOT NULL AND public.is_workspace_owner_of_member(member_id))
);

-- ── goals ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Leaders can view member goals" ON public.goals;
CREATE POLICY "Leaders or workspace owner can view goals"
ON public.goals FOR SELECT
USING (
  is_team_leader(effective_user_id(), member_id)
  OR public.is_workspace_owner_of_member(member_id)
);

-- ── development_plans ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Leaders can view member plans" ON public.development_plans;
CREATE POLICY "Leaders or workspace owner can view PDI plans"
ON public.development_plans FOR SELECT
USING (
  is_team_leader(effective_user_id(), member_id)
  OR public.is_workspace_owner_of_member(member_id)
);

-- ── development_items (via plan → member) ───────────────────────────
DROP POLICY IF EXISTS "Leaders can view member items" ON public.development_items;
CREATE POLICY "Leaders or workspace owner can view PDI items"
ON public.development_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.development_plans dp
    WHERE dp.id = development_items.plan_id
      AND (
        is_team_leader(effective_user_id(), dp.member_id)
        OR public.is_workspace_owner_of_member(dp.member_id)
      )
  )
);

-- ── performance_reviews ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Leaders can view member reviews" ON public.performance_reviews;
CREATE POLICY "Leaders or workspace owner can view reviews"
ON public.performance_reviews FOR SELECT
USING (
  is_team_leader(effective_user_id(), member_id)
  OR public.is_workspace_owner_of_member(member_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Trigger: liderado must always belong to a team that has a leader
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_member_team_has_leader()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _leader uuid;
BEGIN
  -- Only enforce when a real linked user is being attached.
  -- (Pending invites / placeholder rows can exist freely.)
  IF NEW.linked_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT leader_user_id INTO _leader
  FROM public.teams
  WHERE id = NEW.team_id;

  IF _leader IS NULL THEN
    RAISE EXCEPTION 'Liderado não pode ser vinculado a um time sem líder definido (team_id=%)', NEW.team_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_member_team_has_leader ON public.team_members;
CREATE TRIGGER trg_enforce_member_team_has_leader
BEFORE INSERT OR UPDATE OF team_id, linked_user_id ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_member_team_has_leader();