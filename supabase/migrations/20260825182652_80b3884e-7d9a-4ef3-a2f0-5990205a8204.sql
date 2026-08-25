CREATE POLICY "Users can update own upcoming meetings"
ON public.upcoming_meetings
FOR UPDATE
TO authenticated
USING (user_id = public.effective_user_id())
WITH CHECK (user_id = public.effective_user_id());