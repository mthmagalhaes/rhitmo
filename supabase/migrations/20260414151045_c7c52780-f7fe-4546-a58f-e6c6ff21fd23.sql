
CREATE OR REPLACE FUNCTION public.get_invite_status(p_invite_token text)
RETURNS TABLE(
  status text,
  member_id uuid,
  member_name text,
  member_email text,
  workspace_name text,
  linked_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First check: is there a pending invite with this token?
  RETURN QUERY
  SELECT
    'pending'::text AS status,
    tm.id AS member_id,
    tm.name AS member_name,
    tm.email AS member_email,
    w.name AS workspace_name,
    tm.linked_user_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.invite_token = p_invite_token::uuid
    AND tm.invite_status = 'pending';

  IF FOUND THEN RETURN; END IF;

  -- Second check: was there a member whose invite was already accepted?
  -- We search by checking if any member in the workspace had this token previously
  -- Since token is cleared on accept, we look for accepted members by trying UUID match on member id
  -- Alternative: search by the token value stored historically - but we don't store it
  -- Best approach: search for any accepted member whose email matches pattern
  -- Actually, since token is a UUID that was the invite_token, and we clear it,
  -- we need another approach. Let's check if this UUID matches a member_id directly.
  RETURN QUERY
  SELECT
    'already_accepted'::text AS status,
    tm.id AS member_id,
    tm.name AS member_name,
    tm.email AS member_email,
    w.name AS workspace_name,
    tm.linked_user_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE tm.id = p_invite_token::uuid
    AND tm.invite_status = 'accepted';

  IF FOUND THEN RETURN; END IF;

  -- Not found
  RETURN QUERY SELECT
    'not_found'::text,
    NULL::uuid,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::uuid;
END;
$$;
