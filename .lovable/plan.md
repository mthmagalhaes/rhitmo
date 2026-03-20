

## Plan: Smart Nudges for Leaders (In-App Only, Email Later)

### Summary
Create a system that detects leader inactivity (no feedback in 30+ days, missing PDI) and shows in-app nudge banners on the dashboard. An edge function runs daily via cron to generate nudges.

### Corrections to user's approach
- `team_members` has no `leader_id` column — the leader is `workspaces.owner_id` via `teams.workspace_id`
- There's no `evaluations` table — feedback is in `feedbacks` table (with `member_id`, `occurred_at`)
- No FK to `auth.users` on `leader_nudges` (avoid reserved schema references)
- `development_plans` joins via `member_id`, not nested select from `team_members`

### Changes

**1. Database migration** — Create `leader_nudges` table

```sql
CREATE TABLE leader_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL,
  member_id UUID,
  nudge_type TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  severity TEXT DEFAULT 'info',
  dismissed_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_nudges_leader ON leader_nudges(leader_id, dismissed_at);
CREATE INDEX idx_nudges_created ON leader_nudges(created_at DESC);
```

RLS: Leaders can SELECT and UPDATE (dismiss) their own nudges. No INSERT for clients (only service role).

**2. Edge Function: `generate-nudges`**

- `verify_jwt = false` (called by cron)
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- **No-feedback nudge**: Query all members via `team_members → teams → workspaces`, LEFT JOIN `feedbacks` to find `MAX(occurred_at)`. If > 30 days → info, > 60 days → urgent
- **No-PDI nudge**: Members with no rows in `development_plans`
- Deduplication: Skip if active (non-dismissed) nudge of same type+member exists
- No email sending in this iteration

**3. Cron job** — pg_cron + pg_net

SQL insert (not migration) to schedule daily at 12:00 UTC (9h BRT):
```sql
SELECT cron.schedule('generate-nudges-daily', '0 12 * * *', $$
  SELECT net.http_post(
    url:='https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/generate-nudges',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
$$);
```

**4. `src/components/NudgesBanner.tsx`** — New component

- Query `leader_nudges` where `dismissed_at IS NULL`, limit 3, ordered by severity priority then created_at desc
- Color-coded alerts: blue (info), amber (warning), red (urgent)
- "Ver" button navigates to `action_url` and dismisses
- "X" button dismisses only
- `refetchInterval: 60000`

**5. `src/pages/Index.tsx`** — Add `NudgesBanner`

Insert `<NudgesBanner />` after CalendarWidget (~line 382), before LeaderSyncReminder. Only shown for leaders (the component self-guards by returning null if no nudges).

**6. `supabase/config.toml`** — Add function config

```toml
[functions.generate-nudges]
verify_jwt = false
```

### Technical details

Edge function query pattern:
```sql
SELECT tm.id, tm.name, w.owner_id as leader_id,
  MAX(f.occurred_at) as last_feedback_at
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
JOIN workspaces w ON w.id = t.workspace_id
LEFT JOIN feedbacks f ON f.member_id = tm.id
WHERE w.is_active = true
GROUP BY tm.id, tm.name, w.owner_id
HAVING MAX(f.occurred_at) < NOW() - INTERVAL '30 days'
   OR MAX(f.occurred_at) IS NULL;
```

No email in this iteration — `email_sent_at` column exists for future use.

