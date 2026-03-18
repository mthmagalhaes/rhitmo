

## Root Cause

The edge function logs show the exact Stripe error:

> **"Quantity should not be specified where usage_type is `metered`. Remove quantity from `line_items[0]`"**

Both price IDs (`price_1TC52fIF4fHxJpjHPaJXH14r` and `price_1TCPcjIF4fHxJpjHWtZucdwy`) are configured as **metered usage** in Stripe. Metered prices do **not** accept `quantity` in checkout sessions — Stripe rejects the request entirely.

This means the `quantity` parameter we added in the previous fix is actually breaking things. It worked for Pro only because Pro was likely not tested again after that change (or the previous error was different).

## Fix

**File: `supabase/functions/create-checkout-session/index.ts`**

1. **Remove `line_items[0][quantity]`** from the URLSearchParams — metered prices don't accept it
2. **Store quantity in metadata** instead, so the webhook and app logic can use it for seat enforcement:
   - `metadata[quantity]` and `subscription_data[metadata][quantity]`
3. Keep the `quantity >= 3` validation for Business plan (application-level enforcement)
4. Add logging for debugging

```text
params changes:
- REMOVE: "line_items[0][quantity]": String(quantity)
- ADD:    "metadata[quantity]": String(quantity)
- ADD:    "subscription_data[metadata][quantity]": String(quantity)
```

**No changes needed in `src/pages/Billing.tsx`** — the frontend is passing data correctly.

### Files Changed
- `supabase/functions/create-checkout-session/index.ts` — remove quantity from line_items, add to metadata

