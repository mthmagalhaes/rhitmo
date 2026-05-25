ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS metric_baseline numeric,
  ADD COLUMN IF NOT EXISTS metric_direction text NOT NULL DEFAULT 'up';

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_metric_direction_check;
ALTER TABLE public.goals
  ADD CONSTRAINT goals_metric_direction_check CHECK (metric_direction IN ('up','down'));

UPDATE public.goals
  SET metric_baseline = metric_current
  WHERE metric_baseline IS NULL AND metric_current IS NOT NULL;

UPDATE public.goals
  SET metric_direction = 'down'
  WHERE metric_current IS NOT NULL
    AND metric_target IS NOT NULL
    AND metric_current > metric_target
    AND metric_direction = 'up';