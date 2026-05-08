import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

/**
 * Tracks whether the current leader has finished the welcome tour.
 * Persisted in `user_preferences.onboarding_tour_completed_at`.
 */
export function useOnboardingTour() {
  const { user } = useAuth();
  const { isLeader } = useUserRole();
  const [completedAt, setCompletedAt] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('onboarding_tour_completed_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setCompletedAt((data?.onboarding_tour_completed_at as string | null) ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const markComplete = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setCompletedAt(now);
    await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, onboarding_tour_completed_at: now },
        { onConflict: 'user_id' }
      );
  }, [user?.id]);

  const reset = useCallback(async () => {
    if (!user) return;
    setCompletedAt(null);
    await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, onboarding_tour_completed_at: null },
        { onConflict: 'user_id' }
      );
  }, [user?.id]);

  const shouldShowTour = isLeader && completedAt === null;

  return { shouldShowTour, completedAt, markComplete, reset, isLeader };
}
