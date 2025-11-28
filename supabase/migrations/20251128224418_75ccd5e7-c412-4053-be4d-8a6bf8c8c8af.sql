-- Remove the problematic policy
DROP POLICY IF EXISTS "Liderados podem preencher work_style_data via link" ON public.team_members;

-- Create new permissive policy for UPDATE on work_style_data
CREATE POLICY "Permitir update work_style_data via link público"
ON public.team_members
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);