-- Add trigger_source to distinguish auto-calendar bots from manual leader-triggered ones
ALTER TABLE public.recall_bots
  ADD COLUMN IF NOT EXISTS trigger_source text NOT NULL DEFAULT 'auto_calendar',
  ADD COLUMN IF NOT EXISTS leader_check_due_at timestamptz;

-- Backfill existing rows: assume calendar-origin (existing behavior)
UPDATE public.recall_bots
  SET trigger_source = 'auto_calendar'
  WHERE trigger_source IS NULL;

-- Constrain to known values
ALTER TABLE public.recall_bots
  DROP CONSTRAINT IF EXISTS recall_bots_trigger_source_check;
ALTER TABLE public.recall_bots
  ADD CONSTRAINT recall_bots_trigger_source_check
  CHECK (trigger_source IN ('auto_calendar', 'manual'));

-- Index for cron worker to locate bots awaiting leader presence verification
CREATE INDEX IF NOT EXISTS idx_recall_bots_leader_check_pending
  ON public.recall_bots (leader_check_due_at)
  WHERE leader_check_due_at IS NOT NULL
    AND leader_detected = false
    AND status = 'recording';