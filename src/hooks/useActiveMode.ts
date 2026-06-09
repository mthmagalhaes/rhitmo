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
 * - Single-role users see `availableModes` with a single entry (their natural mode)
 *   and `setMode` is a no-op.
 * - Multi-role users default to `'leader'` and can flip to `'company'` via the
 *   WorkspaceSwitcher; choice persists per-user in localStorage.
 *
 * The mode is consumed by `resolvePersona` / `getHomeRoute` to decide which
 * sidebar and home route to show — it never affects RLS or data scoping.
 */
export function useActiveMode() {
  const { id: userId } = useEffectiveUser();
  const { isLeader, isHRAdmin, isWorkspaceOwner, isLinkedMember, loading } = useAccount();

  const hasCompanyMode = isHRAdmin || isWorkspaceOwner;
  // "Leader mode" is only meaningful if the user has team-level surfaces.
  // For HR-admin-only (no team), we keep `leader` out of availableModes.
  const hasLeaderMode = isLeader && !(isHRAdmin && !isWorkspaceOwner && !hasAnyTeamLeadership());
  // Simpler: leader mode available when isLeader true AND not a pure HR-only user.
  // useAccount.isLeader is true for HR admins too (legacy), so we filter:
  const pureHRAdmin = isHRAdmin && !isWorkspaceOwner;
  const canSeeLeader = isLeader && !pureHRAdmin;
  const canSeeCompany = hasCompanyMode;

  const availableModes: ActiveMode[] = [];
  if (canSeeLeader || (!canSeeCompany && !isLinkedMember)) availableModes.push('leader');
  if (canSeeCompany) availableModes.push('company');
  // Fallback: at least one mode if user is leader-only
  if (availableModes.length === 0) availableModes.push('leader');

  const defaultMode: ActiveMode = availableModes.includes('leader') ? 'leader' : 'company';

  const [mode, setModeState] = useState<ActiveMode>(() => {
    const stored = readStored(userId);
    if (stored && availableModes.includes(stored)) return stored;
    return defaultMode;
  });

  // Re-sync when userId changes or roles finish loading.
  useEffect(() => {
    if (loading) return;
    const stored = readStored(userId);
    const next = stored && availableModes.includes(stored) ? stored : defaultMode;
    setModeState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loading, canSeeLeader, canSeeCompany]);

  const setMode = useCallback(
    (next: ActiveMode) => {
      if (!availableModes.includes(next)) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, canSeeLeader, canSeeCompany],
  );

  return {
    mode,
    setMode,
    availableModes,
    canSwitch: availableModes.length > 1,
  };
}

// Placeholder to satisfy the early reference above; replaced by inline logic.
function hasAnyTeamLeadership(): boolean {
  return false;
}
