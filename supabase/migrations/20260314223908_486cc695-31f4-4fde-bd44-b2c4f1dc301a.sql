
-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  plan_tier text NOT NULL DEFAULT 'pulse',
  status text NOT NULL DEFAULT 'incomplete',
  quantity integer DEFAULT 1,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Validation trigger for plan_tier
CREATE OR REPLACE FUNCTION public.validate_subscription_plan_tier()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plan_tier NOT IN ('pulse', 'pro', 'business') THEN
    RAISE EXCEPTION 'Invalid plan_tier: %', NEW.plan_tier;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_subscription_plan_tier
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_plan_tier();

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_subscription_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_subscription_status
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_status();

-- Updated_at trigger
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace owner can read own subscription
CREATE POLICY "Owners can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = subscriptions.workspace_id
        AND w.owner_id = effective_user_id()
    )
  );

-- Service role handles INSERT/UPDATE/DELETE (no policies needed for those)
