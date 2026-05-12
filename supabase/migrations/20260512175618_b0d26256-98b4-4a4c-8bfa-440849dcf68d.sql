-- 1) One-shot cleanup of stuck rows
UPDATE public.slack_conversations
   SET status = 'expired'
 WHERE status = 'active'
   AND expires_at < now();

-- 2) Atomic open-or-resume helper
CREATE OR REPLACE FUNCTION public.open_or_resume_slack_conversation(
  p_workspace_id uuid,
  p_slack_user_id text,
  p_intent text DEFAULT 'general_chat',
  p_ttl_minutes integer DEFAULT 30
)
RETURNS public.slack_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.slack_conversations;
BEGIN
  -- Expire any stale active row for this user so the unique index never blocks us
  UPDATE public.slack_conversations
     SET status = 'expired'
   WHERE slack_user_id = p_slack_user_id
     AND status = 'active'
     AND expires_at < now();

  -- Reuse a still-valid active conversation if it exists
  SELECT *
    INTO v_row
    FROM public.slack_conversations
   WHERE slack_user_id = p_slack_user_id
     AND status = 'active'
     AND expires_at > now()
   ORDER BY last_message_at DESC
   LIMIT 1;

  IF FOUND THEN
    -- Refresh expiration so the session stays alive
    UPDATE public.slack_conversations
       SET expires_at = now() + make_interval(mins => p_ttl_minutes),
           last_message_at = now()
     WHERE id = v_row.id
     RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  -- Otherwise create a fresh one
  BEGIN
    INSERT INTO public.slack_conversations (
      workspace_id, slack_user_id, intent, status, state_data, expires_at
    ) VALUES (
      p_workspace_id, p_slack_user_id, p_intent, 'active', '{"turns": []}'::jsonb,
      now() + make_interval(mins => p_ttl_minutes)
    )
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    -- Race: another request just created one. Force-expire it (defensive) and re-fetch latest active.
    UPDATE public.slack_conversations
       SET status = 'expired'
     WHERE slack_user_id = p_slack_user_id
       AND status = 'active'
       AND expires_at < now();

    SELECT *
      INTO v_row
      FROM public.slack_conversations
     WHERE slack_user_id = p_slack_user_id
       AND status = 'active'
     ORDER BY last_message_at DESC
     LIMIT 1;
  END;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.open_or_resume_slack_conversation(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_or_resume_slack_conversation(uuid, text, text, integer) TO service_role;