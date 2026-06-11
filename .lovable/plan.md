## Remove the "AI-Native desde o dia 1" badge

The selected badge only appears in one place across the app: the hero of `src/pages/Landing.tsx` (lines 971-974). The `AINativeBadge` component itself is imported but never rendered on Landing (the hero uses an inline indigo pill), and it is not used on any other page (other matches are just code comments / unrelated copy).

### Changes
1. **`src/pages/Landing.tsx`**
   - Delete the inline badge `<div>` (lines 971-974) from the hero.
   - Remove the now-unused `aiNativeBadge` keys from the PT and EN copy objects (lines 59 and 279).
   - Remove the unused `import { AINativeBadge }` on line 16.

No other pages render this badge, so nothing else needs to change. Auth / ResetPassword strings ("AI-Native Leadership Partner") and code comments are left untouched since they are not the selected element.