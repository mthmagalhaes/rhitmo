-- Adicionar campos de classificação de cliente
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS client_account text,
  ADD COLUMN IF NOT EXISTS customer_segment text DEFAULT 'beta';

-- Constraint de valores válidos para customer_segment
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workspaces_customer_segment_check'
  ) THEN
    ALTER TABLE public.workspaces 
      ADD CONSTRAINT workspaces_customer_segment_check 
      CHECK (customer_segment IN ('beta','paid','trial','internal','test'));
  END IF;
END $$;

-- Pré-popular workspaces internos do Rhitmo
UPDATE public.workspaces w
SET customer_segment = 'internal',
    client_account = 'Rhitmo (Interno)'
WHERE EXISTS (
  SELECT 1 FROM auth.users u 
  WHERE u.id = w.owner_id 
    AND u.email IN ('matheus@rhitmo.co', 'matheus_hr@rhitmo.co')
);