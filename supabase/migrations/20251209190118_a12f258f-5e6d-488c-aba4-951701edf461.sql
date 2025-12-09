-- Add status column to waitlist_leads for tracking invitation flow
ALTER TABLE public.waitlist_leads 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_waitlist_leads_status ON public.waitlist_leads(status);

COMMENT ON COLUMN public.waitlist_leads.status IS 'Lead status: pending, invited, active';