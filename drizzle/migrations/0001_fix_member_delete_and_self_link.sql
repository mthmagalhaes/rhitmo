ALTER TABLE public.recall_bots DROP CONSTRAINT recall_bots_meeting_transcript_id_fkey;
ALTER TABLE public.recall_bots ADD CONSTRAINT recall_bots_meeting_transcript_id_fkey FOREIGN KEY (meeting_transcript_id) REFERENCES public.meeting_transcripts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.tm_guard_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := public.effective_user_id();
BEGIN
  IF public.is_admin() OR public.rls_check_member_access(OLD.team_id) THEN
    RETURN NEW;
  END IF;

  -- Primeiro acesso: o próprio usuário reivindica o cadastro com o mesmo e-mail
  IF OLD.linked_user_id IS NULL
     AND NEW.linked_user_id IS NOT NULL
     AND NEW.linked_user_id = _uid
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _uid AND lower(u.email) = lower(OLD.email))
     AND NEW.team_id IS NOT DISTINCT FROM OLD.team_id
     AND COALESCE(NEW.role,'') IS NOT DISTINCT FROM COALESCE(OLD.role,'')
     AND NEW.performance_score IS NOT DISTINCT FROM OLD.performance_score
     AND NEW.archived_at IS NOT DISTINCT FROM OLD.archived_at
     AND NEW.archived_by IS NOT DISTINCT FROM OLD.archived_by
  THEN
    RETURN NEW;
  END IF;

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