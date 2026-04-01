

## Plan: Wire Up Slack Invite Status to Member Cards

### Problem
`TeamMemberCard` already accepts `pendingInvite` and `onSendInvite` props, but `Index.tsx` never passes them. The card UI exists but has no data.

### Changes

**1. UPDATE `src/pages/Index.tsx`**

- Add a query to fetch all `pending_slack_invites` with status='sent' for the workspace (join through team_members → teams → workspaces)
- Build a `Map<member_id, PendingInviteInfo>` from results
- Add a `handleSendSlackInvite(member)` function that calls `invite-member-slack` edge function
- Pass `pendingInvite={pendingInvitesMap.get(member.id)}` and `onSendInvite={() => handleSendSlackInvite(member)}` to each `TeamMemberCard`
- Also pass `linked_user_id` in the member object so the card can check connection status

**2. UPDATE `src/components/TeamMemberCard.tsx`**

- Minor: add `linked_user_id` display when member IS connected (show "✅ Slack" badge)
- Show days since invite was sent in the pending badge
- Keep existing logic, just enhance with timestamp display

**3. UPDATE `src/components/NewMemberDialog.tsx`**

- After successful member creation (line ~183), fire-and-forget call to `invite-member-slack` if email is provided
- Update toast messages to mention Slack invite status

**4. Verify `PendingInvitesSection` in Index.tsx**

- Confirm it's already imported and rendered (from previous implementation)
- If not, add it below SetupChecklist

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Query pending invites, pass props to cards, add send handler |
| `src/components/TeamMemberCard.tsx` | Add days-since display, connected status badge |
| `src/components/NewMemberDialog.tsx` | Fire-and-forget Slack invite after member creation |

### Technical Notes
- No database changes needed — `pending_slack_invites` table and RLS already exist
- The `invite-member-slack` edge function already exists and handles both new/existing account flows
- `linked_user_id` is already queried in the members fetch but not passed to the card component

