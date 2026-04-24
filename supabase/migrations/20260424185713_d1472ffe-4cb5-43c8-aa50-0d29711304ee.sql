CREATE OR REPLACE FUNCTION public.create_hr_admin_starter_workspace(
  _workspace_name text,
  _team_name text DEFAULT 'Primeiro time',
  _leader_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _workspace_id uuid;
  _team_id uuid;
  _leader_name text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF COALESCE(trim(_workspace_name), '') = '' THEN
    RAISE EXCEPTION 'Nome do workspace é obrigatório';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE owner_id = _user_id
       OR _user_id = ANY(COALESCE(hr_admin_ids, '{}'::uuid[]))
  ) THEN
    RAISE EXCEPTION 'Usuário já possui um workspace';
  END IF;

  INSERT INTO public.workspaces (name, owner_id, plan_tier, hr_admin_ids)
  VALUES (trim(_workspace_name), _user_id, 'pulse', ARRAY[_user_id])
  RETURNING id INTO _workspace_id;

  INSERT INTO public.teams (workspace_id, name)
  VALUES (_workspace_id, COALESCE(NULLIF(trim(_team_name), ''), 'Primeiro time'))
  RETURNING id INTO _team_id;

  IF COALESCE(trim(_leader_email), '') <> '' THEN
    _leader_name := split_part(trim(_leader_email), '@', 1);

    INSERT INTO public.team_members (
      team_id,
      name,
      email,
      role,
      performance_score,
      invite_status
    )
    VALUES (
      _team_id,
      COALESCE(NULLIF(_leader_name, ''), 'Primeiro líder'),
      lower(trim(_leader_email)),
      'Líder',
      75,
      'pending'
    );
  END IF;

  RETURN _workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_hr_admin_starter_workspace(text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_hr_admin_starter_workspace(text, text, text) FROM anon;