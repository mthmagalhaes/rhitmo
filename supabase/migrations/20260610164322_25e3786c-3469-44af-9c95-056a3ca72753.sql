COMMENT ON COLUMN public.team_members.user_id IS
  'Manager/creator of the team_member row (the leader who added this person). NOT the member''s own auth.users.id — that is linked_user_id, populated when the invited member signs in and claims via claim_team_member_by_email. Historical access (read/edit) follows user_id regardless of subsequent team changes.';

COMMENT ON COLUMN public.team_members.linked_user_id IS
  'auth.users.id of the actual team member, set when the member accepts the invite and signs in. NULL while invite is pending. Use this — not user_id — to scope member-facing data.';