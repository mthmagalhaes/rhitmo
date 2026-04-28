CREATE OR REPLACE FUNCTION public.is_hr_admin_of_workspace(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.effective_user_id() = ANY(
    SELECT unnest(COALESCE(hr_admin_ids, '{}'))
    FROM public.workspaces WHERE id = _workspace_id
  );
END;
$function$;