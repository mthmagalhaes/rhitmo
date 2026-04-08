-- 1. Harden submit_rhitmo_sync_v2: add linked_user_id check
CREATE OR REPLACE FUNCTION public.submit_rhitmo_sync_v2(
  p_member_id uuid,
  p_birth_year integer DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_chronotype text DEFAULT NULL,
  p_feedback_style text DEFAULT NULL,
  p_recognition_style text DEFAULT NULL,
  p_motivators jsonb DEFAULT NULL,
  p_user_manual jsonb DEFAULT NULL,
  p_work_style_data jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the linked user to submit their own sync data
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id = p_member_id AND linked_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you can only submit your own Rhitmo Sync data';
  END IF;

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

-- Revoke anon/public access, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2 FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2 TO authenticated;

-- 2. Fix effective_user_id() with LIMIT 1
CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT impersonated_user_id
     FROM public.admin_impersonation
     WHERE admin_user_id = auth.uid()
     ORDER BY created_at DESC
     LIMIT 1),
    auth.uid()
  )
$$;

-- 3. Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';