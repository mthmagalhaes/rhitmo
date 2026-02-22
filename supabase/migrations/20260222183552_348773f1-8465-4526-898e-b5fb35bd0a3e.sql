CREATE POLICY "Linked members can view own goals"
ON public.goals FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = goals.member_id
      AND tm.linked_user_id = auth.uid()
  )
);