
DO $$
DECLARE
  dup RECORD;
  winner_id uuid;
  loser_ids uuid[];
  loser uuid;
BEGIN
  FOR dup IN
    SELECT
      tm.email,
      tm.linked_user_id,
      (SELECT t.workspace_id FROM teams t WHERE t.id = tm.team_id) AS workspace_id,
      ARRAY_AGG(tm.id ORDER BY tm.created_at ASC) AS ids
    FROM team_members tm
    WHERE tm.linked_user_id IS NOT NULL
      AND tm.email IS NOT NULL
    GROUP BY tm.email, tm.linked_user_id, (SELECT t.workspace_id FROM teams t WHERE t.id = tm.team_id)
    HAVING COUNT(*) > 1
  LOOP
    winner_id := dup.ids[1];
    loser_ids := dup.ids[2:];
    RAISE NOTICE 'Dedupe: email=% winner=% losers=%', dup.email, winner_id, loser_ids;

    FOREACH loser IN ARRAY loser_ids LOOP
      -- Pré-limpa colisões em índices únicos (mantém a linha do winner)
      DELETE FROM upcoming_meetings l
       WHERE l.member_id = loser
         AND EXISTS (SELECT 1 FROM upcoming_meetings w
                     WHERE w.member_id = winner_id
                       AND w.user_id = l.user_id
                       AND w.google_event_id = l.google_event_id);
      DELETE FROM member_prompts l
       WHERE l.member_id = loser
         AND EXISTS (SELECT 1 FROM member_prompts w
                     WHERE w.member_id = winner_id AND w.week_starting = l.week_starting);
      DELETE FROM monthly_recaps l
       WHERE l.member_id = loser
         AND EXISTS (SELECT 1 FROM monthly_recaps w
                     WHERE w.member_id = winner_id AND w.period_month = l.period_month);
      DELETE FROM quarterly_recaps l
       WHERE l.member_id = loser
         AND EXISTS (SELECT 1 FROM quarterly_recaps w
                     WHERE w.member_id = winner_id
                       AND w.period_start = l.period_start
                       AND w.period_end = l.period_end);
      DELETE FROM context_briefs l
       WHERE l.member_id = loser
         AND EXISTS (SELECT 1 FROM context_briefs w
                     WHERE w.member_id = winner_id
                       AND w.window_days = l.window_days
                       AND w.window_start = l.window_start);
      DELETE FROM network_signals l
       WHERE l.member_id = loser
         AND EXISTS (SELECT 1 FROM network_signals w
                     WHERE w.member_id = winner_id
                       AND w.leader_user_id = l.leader_user_id
                       AND w.signal_type = l.signal_type
                       AND w.window_days = l.window_days
                       AND w.detected_on = l.detected_on);
      DELETE FROM slack_ambient_evidence l
       WHERE l.member_id = loser
         AND EXISTS (SELECT 1 FROM slack_ambient_evidence w
                     WHERE w.member_id = winner_id
                       AND w.slack_channel_id = l.slack_channel_id
                       AND w.slack_message_ts = l.slack_message_ts
                       AND w.attribution = l.attribution);
      DELETE FROM graph_events_raw l
       WHERE (l.actor_member_id = loser OR l.target_member_id = loser)
         AND EXISTS (
           SELECT 1 FROM graph_events_raw w
           WHERE w.source = l.source AND w.event_type = l.event_type AND w.external_ref = l.external_ref
             AND COALESCE(w.actor_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
                 = COALESCE(CASE WHEN l.actor_member_id = loser THEN winner_id ELSE l.actor_member_id END,
                            '00000000-0000-0000-0000-000000000000'::uuid)
             AND COALESCE(w.target_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
                 = COALESCE(CASE WHEN l.target_member_id = loser THEN winner_id ELSE l.target_member_id END,
                            '00000000-0000-0000-0000-000000000000'::uuid)
         );

      -- Migrar FKs
      UPDATE feedbacks               SET member_id = winner_id WHERE member_id = loser;
      UPDATE goals                   SET member_id = winner_id WHERE member_id = loser;
      UPDATE performance_reviews     SET member_id = winner_id WHERE member_id = loser;
      UPDATE development_plans       SET member_id = winner_id WHERE member_id = loser;
      UPDATE context_evidence        SET member_id = winner_id WHERE member_id = loser;
      UPDATE pulse_surveys           SET member_id = winner_id WHERE member_id = loser;
      UPDATE peer_feedback_requests  SET subject_member_id = winner_id WHERE subject_member_id = loser;
      UPDATE peer_feedback_requests  SET peer_member_id = winner_id WHERE peer_member_id = loser;
      UPDATE kudos                   SET to_member_id = winner_id WHERE to_member_id = loser;
      UPDATE monthly_recaps          SET member_id = winner_id WHERE member_id = loser;
      UPDATE quarterly_recaps        SET member_id = winner_id WHERE member_id = loser;
      UPDATE context_briefs          SET member_id = winner_id WHERE member_id = loser;
      UPDATE meeting_transcripts     SET member_id = winner_id WHERE member_id = loser;
      UPDATE member_prompts          SET member_id = winner_id WHERE member_id = loser;
      UPDATE leader_nudges           SET member_id = winner_id WHERE member_id = loser;
      UPDATE pending_slack_invites   SET member_id = winner_id WHERE member_id = loser;
      UPDATE upcoming_meetings       SET member_id = winner_id WHERE member_id = loser;
      UPDATE chat_threads            SET member_id = winner_id WHERE member_id = loser;
      UPDATE bias_detections         SET member_id = winner_id WHERE member_id = loser;
      UPDATE mentor_messages         SET member_id = winner_id WHERE member_id = loser;
      UPDATE rhitmo_sync_notifications SET member_id = winner_id WHERE member_id = loser;
      UPDATE network_signals         SET member_id = winner_id WHERE member_id = loser;
      UPDATE slack_ambient_evidence  SET member_id = winner_id WHERE member_id = loser;
      UPDATE recall_bots             SET member_id = winner_id WHERE member_id = loser;
      UPDATE graph_events_raw        SET actor_member_id = winner_id WHERE actor_member_id = loser;
      UPDATE graph_events_raw        SET target_member_id = winner_id WHERE target_member_id = loser;
      UPDATE onboarding_funnel_events SET member_id = winner_id WHERE member_id = loser;

      DELETE FROM team_members WHERE id = loser;
      RAISE NOTICE '  → deletado %', loser;
    END LOOP;
  END LOOP;
END $$;

-- Trigger de defesa: bloqueia duplicatas futuras
CREATE OR REPLACE FUNCTION public.prevent_duplicate_team_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_existing_id uuid;
BEGIN
  IF NEW.email IS NULL OR NEW.linked_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace_id INTO v_workspace_id FROM teams WHERE id = NEW.team_id;
  IF v_workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tm.id INTO v_existing_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE t.workspace_id = v_workspace_id
    AND lower(tm.email) = lower(NEW.email)
    AND tm.linked_user_id = NEW.linked_user_id
    AND tm.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Liderado duplicado (já existe team_member % com mesmo email/linked_user_id neste workspace)', v_existing_id
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_team_member ON public.team_members;
CREATE TRIGGER trg_prevent_duplicate_team_member
BEFORE INSERT OR UPDATE OF email, linked_user_id, team_id ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_team_member();
