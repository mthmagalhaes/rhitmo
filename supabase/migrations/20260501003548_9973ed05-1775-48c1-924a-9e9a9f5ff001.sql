-- Sprint 11.1: Slack Conversations State Machine Foundation

-- 1. Enum for conversation status
DO $$ BEGIN
  CREATE TYPE public.slack_conversation_status AS ENUM ('active', 'completed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS public.slack_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  slack_user_id text NOT NULL,
  status public.slack_conversation_status NOT NULL DEFAULT 'active',
  intent text NOT NULL,
  state_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_slack_conversations_user_status
  ON public.slack_conversations (slack_user_id, status);

CREATE INDEX IF NOT EXISTS idx_slack_conversations_workspace_active
  ON public.slack_conversations (workspace_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_slack_conversations_expires_at
  ON public.slack_conversations (expires_at)
  WHERE status = 'active';

-- One active conversation per Slack user at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_slack_conversations_one_active_per_user
  ON public.slack_conversations (slack_user_id)
  WHERE status = 'active';

-- 4. updated_at trigger (reuse existing helper if present, else create)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = public
    AS $f$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_slack_conversations_updated_at ON public.slack_conversations;
CREATE TRIGGER trg_slack_conversations_updated_at
  BEFORE UPDATE ON public.slack_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS — server-only
ALTER TABLE public.slack_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access slack_conversations" ON public.slack_conversations;
CREATE POLICY "Service role full access slack_conversations"
  ON public.slack_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Helper RPC: get active conversation
CREATE OR REPLACE FUNCTION public.get_active_slack_conversation(p_slack_user_id text)
RETURNS public.slack_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.slack_conversations;
BEGIN
  SELECT *
    INTO v_row
    FROM public.slack_conversations
   WHERE slack_user_id = p_slack_user_id
     AND status = 'active'
     AND expires_at > now()
   ORDER BY last_message_at DESC
   LIMIT 1;
  RETURN v_row;
END;
$$;

-- 7. Helper RPC: append a turn and refresh expiration
CREATE OR REPLACE FUNCTION public.append_slack_conversation_turn(
  p_conversation_id uuid,
  p_turn jsonb,
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
  UPDATE public.slack_conversations
     SET state_data = jsonb_set(
           COALESCE(state_data, '{}'::jsonb),
           '{turns}',
           COALESCE(state_data->'turns', '[]'::jsonb) || jsonb_build_array(p_turn),
           true
         ),
         last_message_at = now(),
         expires_at = now() + make_interval(mins => p_ttl_minutes)
   WHERE id = p_conversation_id
     AND status = 'active'
   RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- 8. Housekeeping: expire stale conversations
CREATE OR REPLACE FUNCTION public.expire_stale_slack_conversations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.slack_conversations
       SET status = 'expired'
     WHERE status = 'active'
       AND expires_at < now()
     RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- 9. Grants for service role (RPC access)
GRANT EXECUTE ON FUNCTION public.get_active_slack_conversation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.append_slack_conversation_turn(uuid, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_slack_conversations() TO service_role;