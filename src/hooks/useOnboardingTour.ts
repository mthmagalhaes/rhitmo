import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePersona } from '@/hooks/usePersona';
import type { TourVariant } from '@/components/onboarding/tourSteps';

const MAX_AUTO_ATTEMPTS = 2;

interface Prefs {
  completedAt: string | null;
  attempts: number;
}

/**
 * Estado do tour guiado do usuário atual, por papel.
 * Persistido em `user_preferences`:
 * - líder: onboarding_tour_completed_at / onboarding_tour_attempts
 * - RH:    hr_tour_completed_at / hr_tour_attempts
 */
export function useOnboardingTour() {
  const { user } = useAuth();
  const persona = usePersona();
  const variant: TourVariant | null =
    persona === 'hr_admin' ? 'hr' : persona === 'leader' ? 'leader' : null;

  const [prefs, setPrefs] = useState<Prefs | undefined>(undefined);

  const completedCol = variant === 'hr' ? 'hr_tour_completed_at' : 'onboarding_tour_completed_at';
  const attemptsCol = variant === 'hr' ? 'hr_tour_attempts' : 'onboarding_tour_attempts';

  useEffect(() => {
    if (!user || !variant) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('onboarding_tour_completed_at, onboarding_tour_attempts, hr_tour_completed_at, hr_tour_attempts')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const row = (data ?? {}) as Record<string, unknown>;
      setPrefs({
        completedAt: (row[completedCol] as string | null) ?? null,
        attempts: (row[attemptsCol] as number | null) ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, variant, completedCol, attemptsCol]);

  const markComplete = useCallback(async () => {
    if (!user || !variant) return;
    const now = new Date().toISOString();
    setPrefs((p) => ({ completedAt: now, attempts: p?.attempts ?? 0 }));
    await supabase.from('user_preferences').upsert(
      variant === 'hr'
        ? { user_id: user.id, hr_tour_completed_at: now }
        : { user_id: user.id, onboarding_tour_completed_at: now },
      { onConflict: 'user_id' },
    );
  }, [user?.id, variant, completedCol]);

  /** Conta que o tour foi oferecido automaticamente (para não insistir para sempre). */
  const registerAttempt = useCallback(async () => {
    if (!user || !variant) return;
    const next = (prefs?.attempts ?? 0) + 1;
    setPrefs((p) => ({ completedAt: p?.completedAt ?? null, attempts: next }));
    await supabase.from('user_preferences').upsert(
      variant === 'hr'
        ? { user_id: user.id, hr_tour_attempts: next }
        : { user_id: user.id, onboarding_tour_attempts: next },
      { onConflict: 'user_id' },
    );
  }, [user?.id, variant, attemptsCol, prefs?.attempts]);

  const reset = useCallback(async () => {
    if (!user || !variant) return;
    setPrefs({ completedAt: null, attempts: 0 });
    await supabase.from('user_preferences').upsert(
      variant === 'hr'
        ? { user_id: user.id, hr_tour_completed_at: null, hr_tour_attempts: 0 }
        : { user_id: user.id, onboarding_tour_completed_at: null, onboarding_tour_attempts: 0 },
      { onConflict: 'user_id' },
    );
  }, [user?.id, variant, completedCol, attemptsCol]);

  const shouldShowTour =
    !!variant && !!prefs && prefs.completedAt === null && prefs.attempts < MAX_AUTO_ATTEMPTS;

  return {
    variant,
    shouldShowTour,
    completedAt: prefs?.completedAt ?? (prefs === undefined ? undefined : null),
    attempts: prefs?.attempts ?? 0,
    markComplete,
    registerAttempt,
    reset,
    /** Compat: existe tour disponível para o papel atual. */
    isLeader: variant !== null,
  };
}
