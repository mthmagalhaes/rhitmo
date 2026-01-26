-- Create meeting_transcripts table
CREATE TABLE public.meeting_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  duration_seconds INTEGER,
  chunk_count INTEGER DEFAULT 1,
  transcript TEXT,
  leader_notes TEXT,
  extracted_themes TEXT[],
  extracted_commitments TEXT[],
  processing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

-- Create policies for meeting_transcripts
CREATE POLICY "Managers can view own meeting transcripts"
ON public.meeting_transcripts
FOR SELECT
USING (manager_id = effective_user_id() AND EXISTS (
  SELECT 1 FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.id = meeting_transcripts.member_id
  AND w.is_active = true
));

CREATE POLICY "Managers can create meeting transcripts"
ON public.meeting_transcripts
FOR INSERT
WITH CHECK (manager_id = effective_user_id() AND EXISTS (
  SELECT 1 FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.id = meeting_transcripts.member_id
  AND w.owner_id = effective_user_id()
  AND w.is_active = true
));

CREATE POLICY "Managers can update own meeting transcripts"
ON public.meeting_transcripts
FOR UPDATE
USING (manager_id = effective_user_id() AND EXISTS (
  SELECT 1 FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.id = meeting_transcripts.member_id
  AND w.is_active = true
));

CREATE POLICY "Managers can delete own meeting transcripts"
ON public.meeting_transcripts
FOR DELETE
USING (manager_id = effective_user_id() AND EXISTS (
  SELECT 1 FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.id = meeting_transcripts.member_id
  AND w.is_active = true
));

-- Add trigger for updated_at
CREATE TRIGGER update_meeting_transcripts_updated_at
BEFORE UPDATE ON public.meeting_transcripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add source column to feedbacks table
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Add meeting_transcript_id to feedbacks (optional FK for meeting-sourced feedbacks)
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS meeting_transcript_id UUID REFERENCES public.meeting_transcripts(id) ON DELETE SET NULL;