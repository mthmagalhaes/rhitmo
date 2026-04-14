import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SupportedLanguage } from '@/i18n';

export function useLocale() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const currentLocale = i18n.language as SupportedLanguage;

  const setLocale = useCallback(async (locale: SupportedLanguage) => {
    // 1. Change i18next language immediately
    await i18n.changeLanguage(locale);

    // 2. Persist in localStorage (handled by i18next detector)
    localStorage.setItem('rhitmo_locale', locale);

    // 3. Persist in user metadata if logged in
    if (user) {
      await supabase.auth.updateUser({
        data: { locale }
      });
    }
  }, [i18n, user]);

  return { currentLocale, setLocale };
}
