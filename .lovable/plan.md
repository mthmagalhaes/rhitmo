

## Plan: Automatic Slack Invitation System for New Team Members

### Summary
When a manager adds a team member, automatically look up their email in the Slack workspace and send a personalized DM with a connect/signup link. Track invitation status and show it on the dashboard and member cards.

### Changes

**1. Database Migration — `pending_slack_invites` table**

```sql
CREATE TABLE public.pending_slack_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  slack_user_id TEXT NOT NULL,
  invited_by UUID NOT NULL,
  member_has_account BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'sent',
  reminded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
CREATE INDEX idx_pending_invites_status ON public.pending_slack_invites(status);
CREATE INDEX idx_pending_invites_member ON public.pending_slack_invites(member_id);
ALTER TABLE public.pending_slack_invites ENABLE ROW LEVEL SECURITY;
```
RLS: Workspace owners can SELECT invites for their members (join through teams). Service role handles INSERT/UPDATE from edge functions.

**2. CREATE `supabase/functions/invite-member-slack/index.ts`**

Edge function (verify_jwt = true) that:
- Receives `{ member_id, member_name, member_email, manager_user_id }`
- Checks if email exists in `auth.users` (via service role) → `has_existing_account`
- Calls Slack `users.lookupByEmail` → gets `slack_user_id` or returns `{ success: false, reason: 'not_in_workspace' }`
- Generates HMAC state token (same pattern as existing `slack-link`) embedding member_id + slack_user_id + has_existing_account
- Sends personalized DM via `chat.postMessage`:
  - Has account → "Conecte sua conta existente" with login-first link
  - No account → "Crie sua conta" with signup-first link
- Inserts into `pending_slack_invites` (status: 'sent', expires_at: now + 7 days)
- Returns `{ success: true, has_existing_account }`

**3. UPDATE `src/components/NewMemberDialog.tsx`**

After successful member creation (line ~183), if email is provided:
- Call `invite-member-slack` edge function (fire-and-forget, don't block the dialog)
- Show contextual toast based on response (success + account status, not_in_workspace, or error)
- Keep existing DISC invite logic unchanged

**4. UPDATE `src/pages/SlackConnect.tsx`**

- Parse `member_id` from search params (passed from invite link)
- When redirecting unauthenticated users to `/auth`, include `signup=true` param if token indicates no existing account
- After successful linking, update `pending_slack_invites` status to 'accepted' via the `slack-link` function

**5. UPDATE `supabase/functions/slack-link/index.ts`**

After successful upsert (line ~156):
- Update `pending_slack_invites` SET status='accepted', accepted_at=now() WHERE slack_user_id matches and status='sent'

**6. CREATE `src/components/team/PendingInvitesSection.tsx`**

- Query `pending_slack_invites` where status='sent' for current workspace members
- Show summary card: "⏳ {count} convites pendentes"
- List with member name, account status badge (green "Aguardando conexão" vs yellow "Aguardando cadastro"), days since sent
- "Reenviar" button calls `invite-member-slack` again

**7. UPDATE `src/pages/Index.tsx`**

- Import and render `PendingInvitesSection` below SetupChecklist (line ~410)

**8. UPDATE `src/components/TeamMemberCard.tsx`**

- Accept optional `pendingInvite` prop
- If member has no `linked_user_id` and has pending invite: show color-coded badge
- If no pending invite and has email: show "Enviar Convite" mini-button

### Files Modified

| File | Action |
|------|--------|
| `supabase/migrations/..._pending_slack_invites.sql` | CREATE |
| `supabase/functions/invite-member-slack/index.ts` | CREATE |
| `supabase/functions/slack-link/index.ts` | UPDATE (mark invite accepted) |
| `src/components/NewMemberDialog.tsx` | UPDATE (trigger invite after creation) |
| `src/pages/SlackConnect.tsx` | UPDATE (handle member_id param, signup hint) |
| `src/components/team/PendingInvitesSection.tsx` | CREATE |
| `src/pages/Index.tsx` | UPDATE (add PendingInvitesSection) |
| `src/components/TeamMemberCard.tsx` | UPDATE (invite status badges) |

### Technical Notes

- The `invite-member-slack` function uses `SUPABASE_SERVICE_ROLE_KEY` to query `auth.users` for email lookup — this cannot be done from the client
- State tokens reuse the existing HMAC-SHA256 pattern from `slack-link`, extended with `member_id:has_account` fields
- The `pending_slack_invites` table intentionally has no FK to `auth.users` (invited_by) to avoid cross-schema references — we store the UUID directly
- Slack `users.lookupByEmail` requires `users:read.email` scope on the bot token
- No changes needed to `slack-bot` interactive handler for now — the unlinked member soft-error already exists

