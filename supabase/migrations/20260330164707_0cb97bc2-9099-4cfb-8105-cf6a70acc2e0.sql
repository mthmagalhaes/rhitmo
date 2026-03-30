
-- Slack integrations: links Slack user IDs to Rhitmo user IDs
CREATE TABLE IF NOT EXISTS public.slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slack_team_id)
);

ALTER TABLE public.slack_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slack integration"
  ON public.slack_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own slack integration"
  ON public.slack_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slack integration"
  ON public.slack_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own slack integration"
  ON public.slack_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Kudos: public recognition records
CREATE TABLE IF NOT EXISTS public.kudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  company_value TEXT,
  slack_channel_id TEXT,
  slack_message_ts TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kudos in own workspace"
  ON public.kudos FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE auth.uid() = ANY(COALESCE(hr_admin_ids, '{}'))
    )
  );

CREATE POLICY "Authenticated users can insert kudos"
  ON public.kudos FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

-- Feedback streaks: gamification tracking
CREATE TABLE IF NOT EXISTS public.feedback_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_feedback_week DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

ALTER TABLE public.feedback_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak"
  ON public.feedback_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Function: Update feedback streak (weekly cadence)
CREATE OR REPLACE FUNCTION public.update_feedback_streak(p_user_id UUID, p_workspace_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_week DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_this_week DATE;
BEGIN
  v_this_week := date_trunc('week', CURRENT_DATE)::DATE;

  SELECT last_feedback_week, current_streak, longest_streak
  INTO v_last_week, v_current_streak, v_longest_streak
  FROM feedback_streaks
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    INSERT INTO feedback_streaks (user_id, workspace_id, current_streak, longest_streak, last_feedback_week)
    VALUES (p_user_id, p_workspace_id, 1, 1, v_this_week);
    RETURN;
  END IF;

  IF v_last_week = v_this_week THEN
    RETURN;
  END IF;

  IF v_last_week = v_this_week - INTERVAL '7 days' THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSE
    v_current_streak := 1;
  END IF;

  UPDATE feedback_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_feedback_week = v_this_week,
    updated_at = NOW()
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id;
END;
$$;

-- Revoke anon access from the function
REVOKE EXECUTE ON FUNCTION public.update_feedback_streak(UUID, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_feedback_streak(UUID, UUID) TO authenticated;
