
CREATE OR REPLACE FUNCTION public.is_hr_admin_of_workspace(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid() = ANY(
    SELECT unnest(COALESCE(hr_admin_ids, '{}'))
    FROM workspaces WHERE id = _workspace_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT impersonated_user_id
     FROM public.admin_impersonation
     WHERE admin_user_id = auth.uid()
     ORDER BY created_at DESC
     LIMIT 1),
    auth.uid()
  );
END;
$$;
