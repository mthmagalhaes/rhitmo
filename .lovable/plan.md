

## Business Self-Service Upgrade + Billing Visual Polish

### 1. Business Quantity Dialog

Add a `BusinessQuantityDialog` component inside `Billing.tsx`:
- Dialog (shadcn) with number input, min 3, max 50
- Real-time price preview: `{quantity} líderes × R$69 = R${quantity * 69}/mês`
- "Continuar para pagamento" button disabled when quantity < 3
- On confirm: calls `handleUpgrade('business', quantity)`

### 2. Update handleUpgrade

- Change signature: `handleUpgrade(plan: string, quantity?: number)`
- Pass `{ plan, quantity: quantity ?? 1 }` to `create-checkout-session`
- Edge function already accepts and uses `quantity` — no backend changes needed

### 3. Replace Business CTA Button

In the Pulse upgrade grid, replace the mailto button with:
```
onClick → open BusinessQuantityDialog
```

Also for Pro→Business upgrade button in active subscription state: open the same dialog.

### 4. Add quantity validation in Edge Function

In `create-checkout-session/index.ts`, add after line 53:
```typescript
if (plan === 'business' && quantity < 3) {
  return error 400 "Business requires minimum 3 leaders"
}
```

### 5. Visual Design Upgrade

Apply across the entire Billing page to match Landing quality:

**Layout**: `max-w-6xl`, `px-4 sm:px-6 lg:px-10`, `space-y-8`

**Plan cards (Pulse state)**:
- `rounded-3xl`, `shadow-lg`, `p-8`
- Price: `text-5xl font-bold`
- Features: `text-base`, `space-y-3`
- Check icons: `h-5 w-5 text-primary`
- Pro card: `border-2 border-primary`, elevated with `-translate-y-2`

**Active subscription card**:
- `rounded-3xl`, `shadow-lg`, `p-8`
- Status badges with soft colors (amber/green/red-50 tones)
- Features in `grid-cols-1 md:grid-cols-2`
- Action buttons: `h-11 rounded-xl`

**Invoices section**:
- Row: `rounded-xl p-4 hover:bg-muted/50 transition-colors`
- Section title: `text-xl font-semibold`

**Typography**:
- Page title: `text-3xl font-bold`
- Section titles: `text-xl font-semibold`
- Body text: `text-base`

### Files Changed

- `src/pages/Billing.tsx` — All UI changes + BusinessQuantityDialog + handleUpgrade signature
- `supabase/functions/create-checkout-session/index.ts` — Add quantity >= 3 validation for business

