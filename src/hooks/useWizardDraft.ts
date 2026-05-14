import { useEffect, useRef, useState } from 'react';

const PREFIX = 'rhitmo:wizard:';
const DEBOUNCE_MS = 500;

interface DraftShape<T> {
  formData: T;
  currentStep: number;
  savedAt: string;
}

/**
 * Persists wizard state ({formData, currentStep}) to localStorage with
 * debounced writes. Survives reload and tab-switching during onboarding.
 *
 * @param key Stable key, e.g. `onboarding:${userId}` or `sync:${memberId}`.
 * @param enabled Set to false to disable persistence (e.g. wizard completed).
 */
export function useWizardDraft<T>(key: string | null, enabled: boolean = true) {
  const fullKey = key ? `${PREFIX}${key}` : null;
  const [restored, setRestored] = useState<DraftShape<T> | null>(null);
  const [didRestore, setDidRestore] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Restore once on mount
  useEffect(() => {
    if (!fullKey || !enabled) {
      setDidRestore(true);
      return;
    }
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftShape<T>;
        setRestored(parsed);
      }
    } catch {
      /* ignore corrupt drafts */
    }
    setDidRestore(true);
  }, [fullKey, enabled]);

  const save = (formData: T, currentStep: number) => {
    if (!fullKey || !enabled) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        const payload: DraftShape<T> = {
          formData,
          currentStep,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(fullKey, JSON.stringify(payload));
      } catch {
        /* quota or disabled storage — silently ignore */
      }
    }, DEBOUNCE_MS);
  };

  const clear = () => {
    if (!fullKey) return;
    try {
      localStorage.removeItem(fullKey);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return { restored, didRestore, save, clear };
}
