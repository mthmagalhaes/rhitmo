-- Permitir que linked users atualizem seu próprio perfil básico (role)
CREATE POLICY "Linked users can update own basic profile"
ON public.team_members
FOR UPDATE
TO authenticated
USING (linked_user_id = auth.uid())
WITH CHECK (linked_user_id = auth.uid());