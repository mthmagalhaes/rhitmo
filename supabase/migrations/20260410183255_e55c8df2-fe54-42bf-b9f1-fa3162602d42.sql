
-- Fix feedbacks SELECT: manager can always view what they created
DROP POLICY IF EXISTS "Leaders can view own feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can view own feedbacks"
ON public.feedbacks FOR SELECT TO public
USING (effective_user_id() = manager_id);

-- Fix feedbacks UPDATE: manager can always update what they created
DROP POLICY IF EXISTS "Leaders can update own feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can update own feedbacks"
ON public.feedbacks FOR UPDATE TO public
USING (effective_user_id() = manager_id);

-- Fix feedbacks DELETE: manager can always delete what they created
DROP POLICY IF EXISTS "Leaders can delete own feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can delete own feedbacks"
ON public.feedbacks FOR DELETE TO public
USING (effective_user_id() = manager_id);

-- Fix meeting_transcripts SELECT
DROP POLICY IF EXISTS "Leaders can view own meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can view own meeting transcripts"
ON public.meeting_transcripts FOR SELECT TO authenticated
USING (manager_id = effective_user_id());

-- Fix meeting_transcripts UPDATE
DROP POLICY IF EXISTS "Leaders can update own meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can update own meeting transcripts"
ON public.meeting_transcripts FOR UPDATE TO authenticated
USING (manager_id = effective_user_id());

-- Fix meeting_transcripts DELETE
DROP POLICY IF EXISTS "Leaders can delete own meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can delete own meeting transcripts"
ON public.meeting_transcripts FOR DELETE TO authenticated
USING (manager_id = effective_user_id());
