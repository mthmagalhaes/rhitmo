-- Sprint 17: Trimestral on-demand + lembrete por aniversário

-- 1) Quarterly recaps: período flexível
ALTER TABLE public.quarterly_recaps
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS period_label text;

-- Backfill existing rows from period_quarter (assume 3 months)
UPDATE public.quarterly_recaps
SET
  period_start = period_quarter,
  period_end = (period_quarter + INTERVAL '3 months')::date,
  period_label = 'Q' || EXTRACT(QUARTER FROM period_quarter)::int || ' ' || EXTRACT(YEAR FROM period_quarter)::int
WHERE period_start IS NULL;

ALTER TABLE public.quarterly_recaps
  ALTER COLUMN period_quarter DROP NOT NULL;

-- Drop old unique to allow multiple periods per member
ALTER TABLE public.quarterly_recaps
  DROP CONSTRAINT IF EXISTS quarterly_recaps_unique_member_quarter;

CREATE UNIQUE INDEX IF NOT EXISTS quarterly_recaps_unique_member_period
  ON public.quarterly_recaps (member_id, period_start, period_end);

-- 2) team_members: idempotência do lembrete de aniversário
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS last_anniversary_nudge_at timestamptz;
