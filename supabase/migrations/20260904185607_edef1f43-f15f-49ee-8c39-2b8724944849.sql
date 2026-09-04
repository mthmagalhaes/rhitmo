CREATE OR REPLACE FUNCTION public.notify_leader_sync_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id UUID;
  v_changes JSONB := '{}';
  v_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.linked_user_id IS NULL OR NEW.linked_user_id != auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT t.leader_user_id INTO v_leader_id
  FROM teams t
  WHERE t.id = NEW.team_id;

  IF v_leader_id IS NULL THEN RETURN NEW; END IF;

  IF OLD.chronotype IS DISTINCT FROM NEW.chronotype THEN
    v_changes := v_changes || jsonb_build_object('chronotype',
      jsonb_build_object('before', to_jsonb(OLD.chronotype), 'after', to_jsonb(NEW.chronotype)));
    v_fields := array_append(v_fields, 'Cronotipo');
  END IF;
  IF OLD.feedback_style IS DISTINCT FROM NEW.feedback_style THEN
    v_changes := v_changes || jsonb_build_object('feedback_style',
      jsonb_build_object('before', to_jsonb(OLD.feedback_style), 'after', to_jsonb(NEW.feedback_style)));
    v_fields := array_append(v_fields, 'Estilo de feedback');
  END IF;
  IF OLD.recognition_style IS DISTINCT FROM NEW.recognition_style THEN
    v_changes := v_changes || jsonb_build_object('recognition_style',
      jsonb_build_object('before', to_jsonb(OLD.recognition_style), 'after', to_jsonb(NEW.recognition_style)));
    v_fields := array_append(v_fields, 'Estilo de reconhecimento');
  END IF;
  IF OLD.work_style_data IS DISTINCT FROM NEW.work_style_data THEN
    v_changes := v_changes || jsonb_build_object('work_style_data',
      jsonb_build_object('before', COALESCE(OLD.work_style_data, '{}'::jsonb), 'after', COALESCE(NEW.work_style_data, '{}'::jsonb)));
    v_fields := array_append(v_fields, 'Estilo de trabalho');
  END IF;
  IF OLD.motivators IS DISTINCT FROM NEW.motivators THEN
    v_changes := v_changes || jsonb_build_object('motivators',
      jsonb_build_object('before', COALESCE(OLD.motivators, '[]'::jsonb), 'after', COALESCE(NEW.motivators, '[]'::jsonb)));
    v_fields := array_append(v_fields, 'Motivadores');
  END IF;
  IF OLD.user_manual IS DISTINCT FROM NEW.user_manual THEN
    v_changes := v_changes || jsonb_build_object('user_manual',
      jsonb_build_object('before', COALESCE(OLD.user_manual, '{}'::jsonb), 'after', COALESCE(NEW.user_manual, '{}'::jsonb)));
    v_fields := array_append(v_fields, 'Manual de instruções');
  END IF;

  IF array_length(v_fields, 1) > 0 THEN
    BEGIN
      INSERT INTO public.rhitmo_sync_notifications (member_id, leader_user_id, changes, change_summary)
      VALUES (NEW.id, v_leader_id, v_changes, array_to_string(v_fields, ', '));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_leader_sync_change: falha ao registrar aviso (%): %', SQLSTATE, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

GRANT INSERT ON public.rhitmo_sync_notifications TO authenticated;

DROP POLICY IF EXISTS "Members can insert own sync notifications" ON public.rhitmo_sync_notifications;
CREATE POLICY "Members can insert own sync notifications"
ON public.rhitmo_sync_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = member_id
      AND tm.linked_user_id = auth.uid()
  )
);