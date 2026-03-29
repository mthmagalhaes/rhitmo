

## Plan: Update Beta User Badge Text

### Summary
Replace the "Acesso Beta Grandfathered" badge text in both instances (lines 511-519 and 696-704) with engaging Brazilian Portuguese copy, gradient styling, and larger typography.

### Changes

**`src/pages/Billing.tsx`** — Update both identical Alert blocks (lines 511-519 and 696-704):

Replace each with:
```jsx
{workspace?.is_beta_user && (
  <Alert className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 dark:border-purple-700/50">
    <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
    <AlertTitle className="text-lg font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
      ⭐ Early Adopter — Acesso Vitalício
    </AlertTitle>
    <AlertDescription className="text-purple-800 dark:text-purple-300">
      Obrigado por acreditar na Rhitmo desde o início! Seu acesso é ilimitado e gratuito para sempre como agradecimento por nos ajudar a construir o produto. 🎉
    </AlertDescription>
  </Alert>
)}
```

Key differences from current:
- `mb-6` + `border-2` for more presence
- Gradient background (`from-purple-50 to-pink-50`) for premium feel
- Larger Crown icon (`h-5 w-5`)
- `text-lg font-bold` title with star emoji
- "Early Adopter — Acesso Vitalício" replaces English jargon
- Warmer, longer gratitude message
- Dark mode variants preserved

