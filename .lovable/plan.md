

## Plan: Fix Pre-Meeting Brief — Auth Bug & Missing Config

### Summary
The pre-meeting brief feature is already fully built. Two bugs prevent it from working: the edge function uses a non-existent `getClaims()` method, and the function config entry is missing from `config.toml`.

### Changes

**1. Fix `supabase/functions/generate-brief/index.ts`** (lines 34-42)

Replace `getClaims()` with `getUser()`:
```typescript
// Before (broken):
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
const userId = claimsData.claims.sub;

// After (correct):
const { data: { user }, error: userError } = await userClient.auth.getUser(token);
if (userError || !user) { return 401 }
const userId = user.id;
```

**2. Add to `supabase/config.toml`**

```toml
[functions.generate-brief]
verify_jwt = false
```

No other changes needed — BriefPage, CalendarWidget, and the AI prompt are all working correctly.

