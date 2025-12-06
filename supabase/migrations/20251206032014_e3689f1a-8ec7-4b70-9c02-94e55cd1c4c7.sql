-- Adicionar coluna plan_tier com default 'pulse'
ALTER TABLE public.workspaces 
ADD COLUMN plan_tier text NOT NULL DEFAULT 'pulse';

-- Adicionar constraint para valores válidos
ALTER TABLE public.workspaces 
ADD CONSTRAINT workspaces_plan_tier_check 
CHECK (plan_tier IN ('pulse', 'flow', 'maestro'));