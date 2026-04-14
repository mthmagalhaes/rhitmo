
-- Create recall_bots table
CREATE TABLE public.recall_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meeting_id UUID REFERENCES public.upcoming_meetings(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  recall_bot_id TEXT NOT NULL,
  meeting_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  transcript TEXT,
  transcript_data JSONB,
  meeting_transcript_id UUID REFERENCES public.meeting_transcripts(id),
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recall_bots ENABLE ROW LEVEL SECURITY;

-- Leaders can view their own bots
CREATE POLICY "Users can view own recall bots"
ON public.recall_bots
FOR SELECT
USING (user_id = auth.uid());

-- Leaders can create bots
CREATE POLICY "Users can create recall bots"
ON public.recall_bots
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Service role handles updates via webhook (no user-facing update policy needed)
-- Admin can view all
CREATE POLICY "Admins can view all recall bots"
ON public.recall_bots
FOR SELECT
USING (public.is_admin());

-- Index for webhook lookups
CREATE INDEX idx_recall_bots_recall_bot_id ON public.recall_bots(recall_bot_id);
CREATE INDEX idx_recall_bots_user_meeting ON public.recall_bots(user_id, meeting_id);

-- Timestamp trigger
CREATE TRIGGER update_recall_bots_updated_at
BEFORE UPDATE ON public.recall_bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
