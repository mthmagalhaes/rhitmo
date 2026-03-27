

## Plan: Email Notifications for Review Sharing & Acknowledgment

### Summary
Update the existing `notify-review-shared` edge function to accept `reviewId` and fetch data server-side, create a new `notify-review-acknowledged` edge function, and wire both into the frontend flows.

### Changes

**1. Update `supabase/functions/notify-review-shared/index.ts`**

Refactor to accept `{ reviewId }` instead of pre-built fields. Use service role client to:
- Fetch review + member info (name, email) + manager info (name) from DB
- Build review link: `https://rhitmo.lovable.app/review/{reviewId}`
- Send via Resend with updated email template including direct link CTA
- Keep existing Rhitmo branding (purple `#7C3AED`)

**2. Create `supabase/functions/notify-review-acknowledged/index.ts`**

New edge function accepting `{ reviewId }`:
- Use service role to fetch review, member name, manager email/name
- Send email to manager: "[Member] confirmou leitura da avaliação"
- CTA links to member details page
- Same Rhitmo branding template

**3. Update `src/components/review/FormalReviewSheet.tsx`**

In `sendMutation.onSuccess`, fire-and-forget call to notify edge function:
```typescript
supabase.functions.invoke('notify-review-shared', { body: { reviewId } })
  .catch(err => console.error('Email notification failed:', err));
```

**4. Update `src/pages/DirectReportReviewView.tsx`**

In `acknowledgeMutation.onSuccess`, fire-and-forget call:
```typescript
supabase.functions.invoke('notify-review-acknowledged', { body: { reviewId } })
  .catch(err => console.error('Email notification failed:', err));
```

**5. Update `supabase/config.toml`**

Add entries for both functions with `verify_jwt = false` (service role handles auth internally). `notify-review-shared` entry already exists implicitly — will keep consistent.

### Technical Notes
- Both functions use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS and fetch review + user data
- `RESEND_API_KEY` already configured in secrets
- Email failures are non-blocking (fire-and-forget) — UI flow continues regardless
- No database changes needed

