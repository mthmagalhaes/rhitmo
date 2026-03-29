-- First update the validation trigger to accept new values
CREATE OR REPLACE FUNCTION public.validate_workspace_plan_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.plan_tier NOT IN ('pulse', 'pro', 'business', 'enterprise', 'flow', 'maestro') THEN
    RAISE EXCEPTION 'Invalid plan_tier: %', NEW.plan_tier;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop the check constraint that's blocking us
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_tier_check;

-- Now migrate existing data
UPDATE workspaces SET plan_tier = 'pro' WHERE plan_tier = 'flow';
UPDATE workspaces SET plan_tier = 'business' WHERE plan_tier = 'maestro';
UPDATE subscriptions SET plan_tier = 'pro' WHERE plan_tier = 'flow';
UPDATE subscriptions SET plan_tier = 'business' WHERE plan_tier = 'maestro';

-- Now tighten the trigger to only new values
CREATE OR REPLACE FUNCTION public.validate_workspace_plan_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.plan_tier NOT IN ('pulse', 'pro', 'business', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid plan_tier: %', NEW.plan_tier;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update subscription validation trigger
CREATE OR REPLACE FUNCTION public.validate_subscription_plan_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.plan_tier NOT IN ('pulse', 'pro', 'business', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid plan_tier: %', NEW.plan_tier;
  END IF;
  RETURN NEW;
END;
$function$;