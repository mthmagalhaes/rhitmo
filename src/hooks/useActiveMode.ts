import { useCallback, useEffect, useState } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { useEffectiveUser } from './useEffectiveUser';

export type ActiveMode = 'leader' | 'company';

const STORAGE_PREFIX = 'rhitmo:active-mode:';

function storageKey(userId: string | null): string | null {
  return userId ? `${STORAGE_PREFIX}${userId}` : null;
}

function readStored(userId: string | null): ActiveMode | null {
  const key = storageKey(userId);
  if (!key) return null;
  try {
    const v = window.localStorage.getItem(key);
    return v === 'leader' || v === 'company' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Active "mode" for users that hold more than one role (Owner/HR + Leader).
 *
 * - Single-role users see `availableModes` with a single entry and `setMode`
 *   is effectively a no-op for them.
 * - Multi-role users default to `'leader'` and can flip to `'company'` via the
 *   WorkspaceSwitcher; choice persists per-user in localStorage.
 *
 * The mode is consumed by `resolvePersona` / `getHomeRoute` to decide which
 * sidebar and home route to show — it never affects RLS or data scoping.
 */
export function useActiveMode() {
  const { id: userId } = useEffectiveUser();
  const { isTeamLeader, isHRAdmin, isWorkspaceOwner, loading } = useAccount();

  // canSeeLeader = "lidera ao menos um time" (vem do RPC get_account_context.is_team_leader).
  // Independente de papel HR/Owner — um HR Admin que também lidera um time deve ver os dois modos.
  const canSeeLeader = isTeamLeader;
  const canSeeCompany = isHRAdmin || isWorkspaceOwner;

  const availableModes: ActiveMode[] = [];
  if (canSeeLeader) availableModes.push('leader');
  if (canSeeCompany) availableModes.push('company');
  if (availableModes.length === 0) availableModes.push('leader');

  const defaultMode: ActiveMode = availableModes.includes('leader') ? 'leader' : 'company';

  const [mode, setModeState] = useState<ActiveMode>(() => {
    const stored = readStored(userId);
    if (stored && (stored === 'leader' ? canSeeLeader : canSeeCompany)) return stored;
    return defaultMode;
  });

  useEffect(() => {
    if (loading) return;
    const stored = readStored(userId);
    const validStored = stored && (stored === 'leader' ? canSeeLeader : canSeeCompany);
    setModeState(validStored ? (stored as ActiveMode) : defaultMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loading, canSeeLeader, canSeeCompany]);

  const setMode = useCallback(
    (next: ActiveMode) => {
      const allowed = next === 'leader' ? canSeeLeader : canSeeCompany;
      if (!allowed) return;
      const key = storageKey(userId);
      if (key) {
        try {
          window.localStorage.setItem(key, next);
        } catch {
          /* ignore quota errors */
        }
      }
      setModeState(next);
    },
    [userId, canSeeLeader, canSeeCompany],
  );

  return {
    mode,
    setMode,
    availableModes,
    canSwitch: availableModes.length > 1,
  };
}
