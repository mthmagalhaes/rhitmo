-- 1. Drop the overly broad policy
DROP POLICY IF EXISTS member_can_acknowledge_review ON performance_reviews;

-- 2. Create secure RPC for marking review as viewed
CREATE OR REPLACE FUNCTION public.member_view_review(p_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE performance_reviews
  SET member_viewed_at = now()
  WHERE id = p_review_id
    AND shared_with_member = true
    AND member_viewed_at IS NULL
    AND member_id IN (
      SELECT id FROM team_members WHERE linked_user_id = auth.uid()
    );
END;
$$;

-- 3. Create secure RPC for acknowledging review
CREATE OR REPLACE FUNCTION public.member_acknowledge_review(p_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE performance_reviews
  SET acknowledged_at = now()
  WHERE id = p_review_id
    AND shared_with_member = true
    AND acknowledged_at IS NULL
    AND member_id IN (
      SELECT id FROM team_members WHERE linked_user_id = auth.uid()
    );
END;
$$;

-- 4. Grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.member_view_review FROM anon, public;
GRANT EXECUTE ON FUNCTION public.member_view_review TO authenticated;

REVOKE EXECUTE ON FUNCTION public.member_acknowledge_review FROM anon, public;
GRANT EXECUTE ON FUNCTION public.member_acknowledge_review TO authenticated;