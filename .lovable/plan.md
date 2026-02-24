

## Google Calendar Integration via Dedicated OAuth

### Overview

Integrate Google Calendar so leaders can connect their account and see upcoming meetings with their direct reports in the next 48h, displayed as a widget on the dashboard.

---

### Prerequisites: Secrets

Three new secrets are required before implementation:
- **GOOGLE_CLIENT_ID** — from Google Cloud Console OAuth credentials
- **GOOGLE_CLIENT_SECRET** — from Google Cloud Console OAuth credentials
- **GOOGLE_REDIRECT_URI** — value: `https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/google-calendar-oauth?action=callback`

These must be added via the secrets tool before proceeding.

---

### Part 1 — Database Migration

Two new tables with RLS:

**google_calendar_tokens** — stores OAuth tokens per user
- Columns: id, user_id (NOT NULL, references auth.users), access_token, refresh_token, token_expiry, calendar_email, created_at, updated_at
- UNIQUE(user_id)
- RLS: all operations restricted to `user_id = effective_user_id()`

**upcoming_meetings** — cached upcoming meetings matched to members
- Columns: id, user_id (NOT NULL, references auth.users), member_id (references team_members), google_event_id, title, start_time, end_time, meet_link, attendees (JSONB), synced_at
- UNIQUE(user_id, google_event_id)
- RLS: SELECT/INSERT/DELETE restricted to `user_id = effective_user_id()`

---

### Part 2 — Edge Function: google-calendar-oauth

**File:** `supabase/functions/google-calendar-oauth/index.ts`

**Config:** `verify_jwt = false` (callback is a redirect from Google, no JWT available)

Three actions via query param or body:

| Action | Auth | Behavior |
|--------|------|----------|
| authorize | JWT required | Builds Google OAuth URL with state=user_id, returns `{ authUrl }` |
| callback | No JWT (redirect) | Exchanges code for tokens, saves to DB, redirects to `/dashboard?calendar=connected` |
| disconnect | JWT required | Deletes token row, returns `{ success: true }` |

Uses service role client for DB writes in callback (no user JWT available during redirect).

---

### Part 3 — Edge Function: fetch-calendar-events

**File:** `supabase/functions/fetch-calendar-events/index.ts`

**Config:** `verify_jwt = false` (manual auth validation)

Flow:
1. Validate user via Authorization header
2. Fetch token from google_calendar_tokens
3. Refresh if expired (POST to Google token endpoint)
4. GET Google Calendar events for next 48h
5. Fetch team_members with email from user's workspace
6. Match event attendees to member emails
7. Upsert into upcoming_meetings (ON CONFLICT)
8. Delete past meetings (start_time < now - 1h)
9. Return matched meetings with member name/role

---

### Part 4 — Hook: useCalendarIntegration

**File:** `src/hooks/useCalendarIntegration.ts` (new)

- `isConnected` query: checks google_calendar_tokens for current user
- `upcomingMeetings` query: invokes fetch-calendar-events (enabled only if connected, 5min stale, 10min refetch)
- `connectCalendar()`: invokes authorize action, redirects to Google
- `disconnectCalendar()`: invokes disconnect action, invalidates queries

---

### Part 5 — CalendarWidget Component

**File:** `src/components/CalendarWidget.tsx` (new)

Four states:
1. **Not connected**: subtle card with "Connect Google Calendar" button
2. **Loading**: skeleton
3. **Connected, no meetings**: "No meetings with reports in next 48h" + disconnect link
4. **Connected, with meetings**: horizontal scrollable cards showing time, member name, event title, "Today"/"Tomorrow" badge, and disconnect link

Rendered in `Index.tsx` after TeamTabs and before the member cards section (around line 352).

---

### Part 6 — Callback Handler in Index.tsx

Add useEffect in Index.tsx to detect `?calendar=connected` query param, show toast, clean URL, and invalidate calendar queries.

---

### Files Changed

| File | Action |
|------|--------|
| supabase/config.toml | Add entries for both new edge functions |
| supabase/functions/google-calendar-oauth/index.ts | New |
| supabase/functions/fetch-calendar-events/index.ts | New |
| src/hooks/useCalendarIntegration.ts | New |
| src/components/CalendarWidget.tsx | New |
| src/pages/Index.tsx | Edit (add CalendarWidget + callback useEffect) |

### What Does NOT Change

- Existing auth flow (Google SSO login)
- Existing tables, RLS, Edge Functions
- AppSidebar, AppLayout, other components

