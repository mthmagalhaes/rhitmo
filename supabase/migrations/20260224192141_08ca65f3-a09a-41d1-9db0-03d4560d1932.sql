
-- Table: google_calendar_tokens
CREATE TABLE public.google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  calendar_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar tokens"
  ON public.google_calendar_tokens FOR SELECT
  TO authenticated
  USING (user_id = effective_user_id());

CREATE POLICY "Users can insert own calendar tokens"
  ON public.google_calendar_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = effective_user_id());

CREATE POLICY "Users can update own calendar tokens"
  ON public.google_calendar_tokens FOR UPDATE
  TO authenticated
  USING (user_id = effective_user_id());

CREATE POLICY "Users can delete own calendar tokens"
  ON public.google_calendar_tokens FOR DELETE
  TO authenticated
  USING (user_id = effective_user_id());

-- Table: upcoming_meetings
CREATE TABLE public.upcoming_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  meet_link TEXT,
  attendees JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

ALTER TABLE public.upcoming_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upcoming meetings"
  ON public.upcoming_meetings FOR SELECT
  TO authenticated
  USING (user_id = effective_user_id());

CREATE POLICY "Users can insert own upcoming meetings"
  ON public.upcoming_meetings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = effective_user_id());

CREATE POLICY "Users can delete own upcoming meetings"
  ON public.upcoming_meetings FOR DELETE
  TO authenticated
  USING (user_id = effective_user_id());
