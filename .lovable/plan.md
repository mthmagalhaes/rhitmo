

## Root Cause

The Stripe prices (`price_1TC52fIF4fHxJpjHPaJXH14r` for Pro and `price_1TCPcjIF4fHxJpjHWtZucdwy` for Business) are configured as **metered usage** in Stripe. Metered prices:
- Reject `quantity` in `line_items` at checkout (causes the error we fixed before)
- Without `quantity`, Stripe shows "O preço varia" and R$0,00 (the current bug)

Metered pricing is designed for pay-as-you-go billing (report usage after the fact). What Rhitmo needs is **licensed (per-seat)** pricing where quantity is set at checkout.

## Fix

### Step 1: Create new licensed prices in Stripe

Using Stripe tools, create two new recurring prices with standard (licensed) usage:

- **Pro**: R$49/mês (unit_amount: 4900 BRL), product `prod_U9J2THubPtVjPT`, recurring monthly
- **Business**: R$69/mês por líder (unit_amount: 6900 BRL), product `prod_U9J2MOGclxYGC2`, recurring monthly

These will be standard recurring prices that accept `quantity` in checkout.

### Step 2: Update Edge Function with new price IDs

**File: `supabase/functions/create-checkout-session/index.ts`**

1. Replace old metered price IDs with new licensed price IDs
2. **Re-add `line_items[0][quantity]`: `String(quantity)`** to the checkout params — this now works because the prices are licensed
3. Keep existing validation (`quantity >= 3` for Business)
4. Keep metadata for webhook tracking

### Step 3: Update stripe-webhook (if needed)

Check if `stripe-webhook` references the old price IDs and update to include both old (for existing subscriptions) and new IDs.

### Files Changed
- `supabase/functions/create-checkout-session/index.ts` — new price IDs + re-add quantity to line_items
- Possibly `supabase/functions/stripe-webhook/index.ts` — add new price IDs

