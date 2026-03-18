

## Fix: Stripe Checkout "Quantity Required" Error

### Root Cause

The edge function logs show: **"Quantity is required. Add `quantity` to `line_items[0]`"**

In `create-checkout-session/index.ts`, line 46 extracts `quantity` from the request body, but lines 102-111 never add it to the checkout session params. Stripe requires `line_items[0][quantity]`.

### Fix

**File: `supabase/functions/create-checkout-session/index.ts`**

Add `quantity` to the checkout params after line 105:

```typescript
const params = new URLSearchParams({
  mode: "subscription",
  customer: customerId,
  "line_items[0][price]": PRICE_IDS[plan],
  "line_items[0][quantity]": String(quantity),  // <-- ADD THIS
  allow_promotion_codes: "true",
  ...
});
```

**File: `src/pages/Billing.tsx`**

Improve error handling in `handleUpgrade` to show the actual error message for debugging:

```typescript
catch (err: any) {
  toast({
    title: 'Erro ao iniciar checkout',
    description: err?.message || 'Tente novamente...',
    variant: 'destructive',
  });
}
```

### Deployment

Redeploy `create-checkout-session` edge function after the fix.

