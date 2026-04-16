CREATE POLICY "Users can update own mentor messages"
ON public.mentor_messages
FOR UPDATE
TO public
USING (effective_user_id() = user_id)
WITH CHECK (effective_user_id() = user_id);