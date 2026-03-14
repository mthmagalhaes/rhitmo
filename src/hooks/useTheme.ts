import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useThemeManager() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });
  const [userId, setUserId] = useState<string | null>(null);

  // Resolve the effective theme
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  // Apply on mount and when theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen to system preference changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Load user preference from DB on auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      supabase
        .from('user_preferences')
        .select('theme_preference')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.theme_preference) {
            const t = data.theme_preference as Theme;
            setThemeState(t);
            localStorage.setItem('theme', t);
          }
        });
    });
  }, []);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    if (userId) {
      await supabase
        .from('user_preferences')
        .upsert(
          { user_id: userId, theme_preference: newTheme, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    }
  }, [userId]);

  return { theme, setTheme, resolvedTheme };
}
