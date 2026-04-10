-- Clean stray team_member record that has Matheus's email in the wrong workspace
-- This prevents any auto-link logic from accidentally matching this record
UPDATE public.team_members 
SET email = NULL 
WHERE id = '5cdac13f-db4c-4a8e-b8d1-a0e0c089b071' 
AND email = 'matheus.magalhaes@fstr.co'
AND name = 'João Silva';

-- Also clean the matheus@rhitmo.co stray record
UPDATE public.team_members 
SET email = NULL 
WHERE id = '565c898c-7b19-4daf-b211-7f9eb62f3da5' 
AND email = 'matheus@rhitmo.co'
AND name = 'Joana Akira';