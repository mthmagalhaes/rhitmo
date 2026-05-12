-- 1. Trigger function: ensure workspace_slack_settings exists when a slack_integrations row is created
CREATE OR REPLACE FUNCTION public.ensure_workspace_slack_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_slack_settings (workspace_id, ambient_mode_enabled, autojoin_public_channels)
  VALUES (NEW.workspace_id, true, true)
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_workspace_slack_settings ON public.slack_integrations;
CREATE TRIGGER trg_ensure_workspace_slack_settings
  AFTER INSERT ON public.slack_integrations
  FOR EACH ROW EXECUTE FUNCTION public.ensure_workspace_slack_settings();

-- 2. Backfill: add settings rows for any workspace that already has a Slack integration
INSERT INTO public.workspace_slack_settings (workspace_id, ambient_mode_enabled, autojoin_public_channels)
SELECT DISTINCT si.workspace_id, true, true
FROM public.slack_integrations si
LEFT JOIN public.workspace_slack_settings wss ON wss.workspace_id = si.workspace_id
WHERE wss.workspace_id IS NULL;