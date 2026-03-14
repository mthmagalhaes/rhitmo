

## Dark / Light / System Theme Support

### Overview

Add a complete theming system with dark mode CSS variables, a theme context/hook, a visual toggle in the profile settings dialog, and persistence via a new `user_preferences` table.

### Files to Create/Modify

**1. Database Migration** — Create `user_preferences` table (no existing `profiles` table)

```sql
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_preference text NOT NULL DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
```

**2. `src/index.css`** — Add `.dark` selector block with all dark theme variables

Dark palette as specified: `--background: 240 10% 11%` (#1a1a1f), `--primary: 263 86% 76%` (#a78bfa), etc. Shadows adjusted for dark. Sidebar variables updated for dark glass effect.

**3. `src/hooks/useTheme.ts`** — New hook/context

- Reads preference from `user_preferences` table (or localStorage fallback for non-authenticated)
- Applies `dark` class to `<html>` element
- Listens to `prefers-color-scheme` media query for `system` mode
- Provides `theme`, `setTheme`, `resolvedTheme`
- Inline script in `index.html` to prevent flash (reads localStorage before React mounts)

**4. `src/components/ThemeProvider.tsx`** — Context provider wrapping the app

- Wraps `useTheme` logic in a React context
- Added to `App.tsx` inside the QueryClientProvider

**5. `src/components/ThemeSelector.tsx`** — Visual toggle component

- Three side-by-side cards (Light / Dark / System) with mini preview rectangles
- Selected card gets primary border
- Used inside `ProfileSettingsDialog`

**6. `src/components/ProfileSettingsDialog.tsx`** — Add "Aparência" section

- Import and render `ThemeSelector` between the Cargo field and Manutenção section
- Theme changes apply immediately (no need to click Save)

**7. `src/components/ui/sidebar.tsx`** — Update glassmorphism for dark mode

- Change inline `background` to use CSS variable or conditional: light = `rgba(255,255,255,0.55)`, dark = `rgba(26,26,31,0.7)`
- Border in dark: `rgba(255,255,255,0.06)`

**8. `index.html`** — Add inline script to prevent theme flash

```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'system';
    if(t === 'system') t = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    if(t === 'dark') document.documentElement.classList.add('dark');
  })();
</script>
```

**9. `src/App.tsx`** — Wrap with ThemeProvider

### What does NOT change
- Light mode CSS variables (untouched)
- Layout, navigation, pages, features
- No other components modified beyond sidebar glassmorphism dark variant and profile dialog

