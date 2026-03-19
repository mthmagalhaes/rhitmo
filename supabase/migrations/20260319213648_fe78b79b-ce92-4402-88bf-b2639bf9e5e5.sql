
-- Create notification table
CREATE TABLE rhitmo_sync_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  leader_user_id UUID NOT NULL,
  changes JSONB NOT NULL,
  change_summary TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_notif_leader ON rhitmo_sync_notifications(leader_user_id, read_at);
CREATE INDEX idx_sync_notif_created ON rhitmo_sync_notifications(created_at DESC);

-- RLS
ALTER TABLE rhitmo_sync_notifications ENABLE ROW LEVEL SECURITY;

-- Leaders can view their notifications
CREATE POLICY "Leaders can view own sync notifications"
  ON rhitmo_sync_notifications FOR SELECT
  TO authenticated
  USING (leader_user_id = auth.uid());

-- Leaders can update (mark as read)
CREATE POLICY "Leaders can update own sync notifications"
  ON rhitmo_sync_notifications FOR UPDATE
  TO authenticated
  USING (leader_user_id = auth.uid())
  WITH CHECK (leader_user_id = auth.uid());

-- Trigger function
CREATE OR REPLACE FUNCTION notify_leader_sync_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_leader_id UUID;
  v_changes JSONB := '{}';
  v_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Only notify when linked member updates their own record
  IF NEW.linked_user_id IS NULL OR NEW.linked_user_id != auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Find leader (workspace owner)
  SELECT w.owner_id INTO v_leader_id
  FROM teams t JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = NEW.team_id;

  IF v_leader_id IS NULL THEN RETURN NEW; END IF;

  -- Compare chronotype
  IF OLD.chronotype IS DISTINCT FROM NEW.chronotype THEN
    v_changes := v_changes || jsonb_build_object('chronotype',
      jsonb_build_object('before', to_jsonb(OLD.chronotype), 'after', to_jsonb(NEW.chronotype)));
    v_fields := array_append(v_fields, 'Cronotipo');
  END IF;

  -- Compare feedback_style
  IF OLD.feedback_style IS DISTINCT FROM NEW.feedback_style THEN
    v_changes := v_changes || jsonb_build_object('feedback_style',
      jsonb_build_object('before', to_jsonb(OLD.feedback_style), 'after', to_jsonb(NEW.feedback_style)));
    v_fields := array_append(v_fields, 'Estilo de feedback');
  END IF;

  -- Compare recognition_style
  IF OLD.recognition_style IS DISTINCT FROM NEW.recognition_style THEN
    v_changes := v_changes || jsonb_build_object('recognition_style',
      jsonb_build_object('before', to_jsonb(OLD.recognition_style), 'after', to_jsonb(NEW.recognition_style)));
    v_fields := array_append(v_fields, 'Estilo de reconhecimento');
  END IF;

  -- Compare work_style_data
  IF OLD.work_style_data IS DISTINCT FROM NEW.work_style_data THEN
    v_changes := v_changes || jsonb_build_object('work_style_data',
      jsonb_build_object('before', COALESCE(OLD.work_style_data, '{}'::jsonb), 'after', COALESCE(NEW.work_style_data, '{}'::jsonb)));
    v_fields := array_append(v_fields, 'Estilo de trabalho');
  END IF;

  -- Compare motivators
  IF OLD.motivators IS DISTINCT FROM NEW.motivators THEN
    v_changes := v_changes || jsonb_build_object('motivators',
      jsonb_build_object('before', COALESCE(OLD.motivators, '[]'::jsonb), 'after', COALESCE(NEW.motivators, '[]'::jsonb)));
    v_fields := array_append(v_fields, 'Motivadores');
  END IF;

  -- Compare user_manual
  IF OLD.user_manual IS DISTINCT FROM NEW.user_manual THEN
    v_changes := v_changes || jsonb_build_object('user_manual',
      jsonb_build_object('before', COALESCE(OLD.user_manual, '{}'::jsonb), 'after', COALESCE(NEW.user_manual, '{}'::jsonb)));
    v_fields := array_append(v_fields, 'Manual de instruções');
  END IF;

  -- If changes detected, insert notification
  IF array_length(v_fields, 1) > 0 THEN
    INSERT INTO rhitmo_sync_notifications (member_id, leader_user_id, changes, change_summary)
    VALUES (NEW.id, v_leader_id, v_changes, array_to_string(v_fields, ', '));
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_team_member_sync_updated
  AFTER UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_leader_sync_change();
