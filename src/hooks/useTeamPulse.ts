import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeRpc, tryRpc } from '@/lib/supabaseSafe';

export type SignalType = 'isolate' | 'super_connector' | 'pattern_drop' | 'pattern_spike';
export type SignalSeverity = 'info' | 'watch' | 'attention';

export interface PulseSignal {
  id: string;
  member_id: string;
  member_name: string | null;
  signal_type: SignalType;
  severity: SignalSeverity;
  payload: Record<string, unknown>;
  detected_at: string;
}

interface UseTeamPulseResult {
  signals: PulseSignal[];
  loading: boolean;
  refetch: () => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  counts: { quiet: number; super: number; changes: number };
}

export function useTeamPulse(windowDays: 30 | 60 | 90 = 30): UseTeamPulseResult {
  const [signals, setSignals] = useState<PulseSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPulse = useCallback(async () => {
    setLoading(true);
    try {
      const data = await safeRpc<PulseSignal[]>('get_team_pulse', { _window_days: windowDays });
      setSignals(data ?? []);
    } catch (err) {
      console.warn('[useTeamPulse] failed', err);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    fetchPulse();
  }, [fetchPulse]);

  const acknowledge = useCallback(async (id: string) => {
    // Optimistic
    setSignals((prev) => prev.filter((s) => s.id !== id));
    await tryRpc('acknowledge_network_signal', { _signal_id: id });
  }, []);

  const counts = {
    quiet: signals.filter((s) => s.signal_type === 'isolate').length,
    super: signals.filter((s) => s.signal_type === 'super_connector').length,
    changes: signals.filter(
      (s) => s.signal_type === 'pattern_drop' || s.signal_type === 'pattern_spike',
    ).length,
  };

  return { signals, loading, refetch: fetchPulse, acknowledge, counts };
}
