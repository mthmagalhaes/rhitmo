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
  v_actor_name         text;
BEGIN
  IF NEW.visibility IS DISTINCT FROM 'shared' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.visibility = 'shared' THEN
    RETURN NEW;
  END IF;

  SELECT tm.linked_user_id, tm.name, t.workspace_id
    INTO v_member_linked_user, v_member_name, v_workspace_id
  FROM public.team_members tm
  LEFT JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.id = NEW.member_id;

  IF v_member_linked_user IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve nome do ator (manager). Tenta auth.users.raw_user_meta_data->>'full_name', cai pro email.
  SELECT COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'Seu líder')
    INTO v_actor_name
  FROM auth.users au
  WHERE au.id = NEW.manager_id;

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
        'feedback_id',      NEW.id,
        'feedback_title',   COALESCE(NEW.title, ''),
        'feedback_type',    NEW.type,
        'occurred_at',      NEW.occurred_at,
        -- Campos consumidos pelo template feedback-shared.tsx:
        'memberName',       v_member_name,
        'actorName',        COALESCE(v_actor_name, 'Seu líder'),
        'summary',          COALESCE(NEW.summary, LEFT(NEW.content, 280)),
        'feedbackUrl',      'https://rhitmo.co/dashboard?feedback=' || NEW.id::text
      ),
      'pending'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'emit_feedback_shared_event failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;