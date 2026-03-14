
-- Add unique constraint on workspace_id for upsert support
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_workspace_id_key UNIQUE (workspace_id);
