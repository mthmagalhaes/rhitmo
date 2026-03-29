

## Plan: Pro ↔ Business Upgrade/Downgrade via Stripe Subscription Update

### Summary
Create an `update-subscription` edge function that updates existing Stripe subscriptions in-place (maintaining history), and update the Billing page to use it for Pro→Business upgrades and Business→Pro downgrades instead of creating new checkout sessions.

### Changes

**1. Create `supabase/functions/update-subscription/index.ts`**

Edge function that:
- Authenticates user via `getUser(token)`
- Accepts `{ newPriceId, quantity }` in body
- Looks up workspace's `stripe_subscription_id` from `subscriptions` table
- Calls `stripe.subscriptions.update()` with new price item and `proration_behavior: 'create_prorations'`
- For downgrades (Business→Pro), does NOT update DB directly — relies on webhook `customer.subscription.updated` to sync
- Returns success/error

**2. Update `supabase/config.toml`**

Add:
```
[functions.update-subscription]
verify_jwt = false
```

**3. Update `src/pages/Billing.tsx`**

For Pro users with active subscription (non-canceled):
- The existing "Fazer upgrade para Business" button already exists (line 548) — change it to call `update-subscription` instead of `create-checkout-session` when there's an active subscription
- Add `handlePlanChange` function that invokes `update-subscription` with the target price ID and quantity

For Business users with active subscription:
- Add "Fazer downgrade para Pro" outline button next to "Trocar cartão"
- Show confirmation AlertDialog before downgrading (lists features they'll lose: HR Dashboard, >5 members, etc.)
- On confirm, call `update-subscription` with Pro price ID, quantity 1

Refactor `BusinessQuantityDialog` `onConfirm` to check if already subscribed:
- If `subscription` exists → call `update-subscription` (plan change)
- If no subscription → call `create-checkout-session` (new checkout, current behavior)

**4. Webhook already handles updates**

The existing `customer.subscription.updated` handler in `stripe-webhook/index.ts` (lines 146-184) already:
- Reads new price ID and maps to plan tier via `PRICE_TO_PLAN`
- Updates `subscriptions` table (status, plan_tier, price_id, quantity)
- Updates `workspaces.plan_tier`

No webhook changes needed.

### Technical Notes
- Proration is handled by Stripe automatically via `proration_behavior: 'create_prorations'`
- Upgrade (Pro→Business) takes effect immediately; downgrade (Business→Pro) also immediate per Stripe default, but prorated credit applied
- The edge function fetches subscription ID from DB rather than trusting client input
- Invalidating `['subscription']` and `['workspace-billing']` queries after success ensures UI reflects changes once webhook fires

