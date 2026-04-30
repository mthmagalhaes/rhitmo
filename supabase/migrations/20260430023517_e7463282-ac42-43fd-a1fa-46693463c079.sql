-- Função do trigger: emite feedback.shared no event bus
CREATE OR REPLACE FUNCTION public.emit_feedback_shared_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_linked_user uuid;
  v_workspace_id       uuid;
  v_member_name        text;
BEGIN
  -- Só dispara quando visibility passa para 'shared'
  IF NEW.visibility IS DISTINCT FROM 'shared' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.visibility = 'shared' THEN
    -- Já era shared; nada a fazer
    RETURN NEW;
  END IF;

  -- Busca destinatário e workspace
  SELECT tm.linked_user_id, tm.name, t.workspace_id
    INTO v_member_linked_user, v_member_name, v_workspace_id
  FROM public.team_members tm
  LEFT JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.id = NEW.member_id;

  -- Sem destinatário vinculado, não tem o que notificar in-app
  IF v_member_linked_user IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.events (
      event_type, workspace_id, actor_user_id, target_user_id,
      channels, payload, status
    ) VALUES (
      'feedback.shared',
      v_workspace_id,
      NEW.manager_id,
      v_member_linked_user,
      ARRAY['inapp','email']::text[],
      jsonb_build_object(
        'feedback_id', NEW.id,
        'feedback_title', COALESCE(NEW.title, ''),
        'feedback_summary', COALESCE(NEW.summary, LEFT(NEW.content, 280)),
        'feedback_type', NEW.type,
        'member_name', v_member_name,
        'occurred_at', NEW.occurred_at
      ),
      'pending'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Nunca derruba o UPDATE original por falha do bus
    RAISE WARNING 'emit_feedback_shared_event failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Trigger AFTER INSERT or UPDATE
DROP TRIGGER IF EXISTS trg_emit_feedback_shared ON public.feedbacks;
CREATE TRIGGER trg_emit_feedback_shared
AFTER INSERT OR UPDATE OF visibility ON public.feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.emit_feedback_shared_event();

COMMENT ON FUNCTION public.emit_feedback_shared_event() IS
  'Onda 4.3 Fluxo A: dispara feedback.shared no Event Bus quando um feedback é compartilhado.';