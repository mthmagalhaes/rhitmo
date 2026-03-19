

## Plan: Rhitmo Sync Change Notifications for Leaders

### Summary
When a direct report updates their Rhitmo Sync (chronotype, feedback style, recognition style, or work_style_data fields on `team_members`), create a notification for their leader showing what changed. Display an unread count badge in the sidebar and a notification sheet.

### Problem with the user's proposed approach
The user's trigger references columns and tables that don't exist (`direct_report_profiles`, `career_aspirations`, etc.). The actual Rhitmo Sync data lives on `team_members` with columns: `chronotype`, `feedback_style`, `recognition_style`, `work_style_data` (JSONB). The leader is the workspace owner (`workspaces.owner_id`), not a `leader_id` column on `team_members`. The trigger must be adapted to this schema.

### Changes

**1. Database migration** — Create notification table + trigger

Create `rhitmo_sync_notifications` table:
```sql
CREATE TABLE rhitmo_sync_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  leader_user_id UUID NOT NULL,
  changes JSONB NOT NULL,
  change_summary TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sync_notif_leader ON rhitmo_sync_notifications(leader_user_id, read_at);
```

RLS policies (leaders see/update only their own notifications).

Trigger function on `team_members` AFTER UPDATE that:
- Compares OLD vs NEW for `chronotype`, `feedback_style`, `recognition_style`, `work_style_data`
- Looks up the leader via `teams.workspace_id → workspaces.owner_id`
- Only fires when the updater is the linked member (not the leader editing)
- Inserts a notification row with the diff

**2. `src/components/SyncNotificationBadge.tsx`** — New component

- Query `rhitmo_sync_notifications` where `read_at IS NULL`, count only
- Render a red badge on a Bell icon if count > 0
- `refetchInterval: 30000`

**3. `src/components/SyncNotificationSheet.tsx`** — New component

- Sheet with list of notifications, joined with `team_members(name)`
- Each item shows: member name, timestamp, change summary
- Expandable diff (before/after) using `<details>`
- "Mark as read" per item + "Mark all as read" button
- Mutations invalidate both queries

**4. `src/components/AppLayout.tsx`** — Add badge + sheet to header

- Import `SyncNotificationBadge` and `SyncNotificationSheet`
- Add Bell icon button with badge in the header bar (both mobile and desktop)
- State for sheet open/close
- Only render for non-linked-members (leaders)

**5. `src/components/dashboard/DirectReportDashboard.tsx`** — No changes needed

The existing `handleSaveSync` already updates `team_members` directly, which will fire the trigger automatically.

### Technical details

Trigger function (SECURITY DEFINER):
```sql
CREATE OR REPLACE FUNCTION notify_leader_sync_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_leader_id UUID;
  v_changes JSONB := '{}';
  v_fields TEXT[] := '{}';
BEGIN
  -- Only notify when linked member updates their own record
  IF NEW.linked_user_id IS NULL OR NEW.linked_user_id != auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Find leader (workspace owner)
  SELECT w.owner_id INTO v_leader_id
  FROM teams t JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = NEW.team_id;

  IF v_leader_id IS NULL THEN RETURN NEW; END IF;

  -- Compare fields
  IF OLD.chronotype IS DISTINCT FROM NEW.chronotype THEN
    v_changes := v_changes || jsonb_build_object('chronotype', 
      jsonb_build_object('before', OLD.chronotype, 'after', NEW.chronotype));
    v_fields := array_append(v_fields, 'Cronotipo');
  END IF;
  -- (same for feedback_style, recognition_style, work_style_data)

  IF array_length(v_fields, 1) > 0 THEN
    INSERT INTO rhitmo_sync_notifications (member_id, leader_user_id, changes, change_summary)
    VALUES (NEW.id, v_leader_id, v_changes, array_to_string(v_fields, ', '));
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_team_member_sync_updated
  AFTER UPDATE ON team_members FOR EACH ROW
  EXECUTE FUNCTION notify_leader_sync_change();
```

The notification sheet joins `team_members` for the member name. The badge uses `head: true` count query for efficiency.

