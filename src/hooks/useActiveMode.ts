import { useCallback, useSyncExternalStore } from 'react';
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

// ---------------------------------------------------------------------------
// Module-scoped store
// ---------------------------------------------------------------------------
// Antes este hook usava `useState` local, então cada consumidor (AppSidebar,
// WorkspaceSwitcher, RoleRouteGuard) mantinha uma cópia independente do modo
// ativo. Clicar em "Minha equipe" atualizava o estado de um componente mas o
// guard continuava lendo o anterior — usuários multi-CAP (Owner/HR + Líder)
// ficavam presos na visão errada. Aqui centralizamos num store de módulo
// consumido via useSyncExternalStore para garantir re-render coordenado.

type Listener = () => void;
const listeners = new Set<Listener>();
const modeByUser = new Map<string, ActiveMode>();
let lastSnapshotKey = '';
let lastSnapshot: ActiveMode = 'leader';

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(userId: string | null, fallback: ActiveMode): ActiveMode {
  const key = userId ?? '__anon__';
  const current = modeByUser.get(key) ?? fallback;
  // Cacheia para preservar identidade entre renders (useSyncExternalStore
  // exige snapshot estável quando nada mudou).
  if (lastSnapshotKey === key && lastSnapshot === current) return lastSnapshot;
  lastSnapshotKey = key;
  lastSnapshot = current;
  return current;
}

function writeMode(userId: string | null, next: ActiveMode) {
  const key = userId ?? '__anon__';
  if (modeByUser.get(key) === next) return;
  modeByUser.set(key, next);
  const storageK = storageKey(userId);
  if (storageK) {
    try {
      window.localStorage.setItem(storageK, next);
    } catch {
      /* ignore quota errors */
    }
  }
  emit();
}

// Cross-tab sync: outro tab muda o modo → propaga.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(STORAGE_PREFIX)) return;
    const uid = e.key.slice(STORAGE_PREFIX.length);
    const next = e.newValue;
    if (next === 'leader' || next === 'company') {
      if (modeByUser.get(uid) !== next) {
        modeByUser.set(uid, next);
        emit();
      }
    }
  });
}

/**
 * Active "mode" for users that hold more than one role (Owner/HR + Leader).
 *
 * - Single-role users see `availableModes` with a single entry and `setMode`
 *   is effectively a no-op for them.
 * - Multi-role users default to `'leader'` and can flip to `'company'` via the
 *   WorkspaceSwitcher; choice persists per-user in localStorage e é
 *   compartilhada entre todos os consumidores via store de módulo.
 *
 * O modo é consumido por `resolvePersona` / `getHomeRoute` para decidir qual
 * sidebar e home route exibir — nunca afeta RLS ou escopo de dados.
 */
export function useActiveMode() {
  const { id: userId } = useEffectiveUser();
  const { isTeamLeader, isHRAdmin, isWorkspaceOwner } = useAccount();

  // canSeeLeader = "lidera ao menos um time" (vem do RPC
  // get_account_context.is_team_leader). Independe de papel HR/Owner — um HR
  // Admin que também lidera um time deve ver os dois modos.
  const canSeeLeader = isTeamLeader;
  const canSeeCompany = isHRAdmin || isWorkspaceOwner;

  const availableModes: ActiveMode[] = [];
  if (canSeeLeader) availableModes.push('leader');
  if (canSeeCompany) availableModes.push('company');
  if (availableModes.length === 0) availableModes.push('leader');

  const defaultMode: ActiveMode = availableModes.includes('leader') ? 'leader' : 'company';

  // Hidrata o store a partir do localStorage assim que conhecemos o userId.
  const key = userId ?? '__anon__';
  if (!modeByUser.has(key)) {
    const stored = readStored(userId);
    const valid = stored && (stored === 'leader' ? canSeeLeader : canSeeCompany);
    modeByUser.set(key, valid ? (stored as ActiveMode) : defaultMode);
  } else {
    // Se o modo armazenado deixou de ser válido (papéis mudaram), normaliza.
    const current = modeByUser.get(key)!;
    const stillValid = current === 'leader' ? canSeeLeader : canSeeCompany;
    if (!stillValid) {
      modeByUser.set(key, defaultMode);
    }
  }

  const mode = useSyncExternalStore(
    subscribe,
    () => getSnapshot(userId, defaultMode),
    () => defaultMode,
  );

  const setMode = useCallback(
    (next: ActiveMode) => {
      const allowed = next === 'leader' ? canSeeLeader : canSeeCompany;
      if (!allowed) return;
      writeMode(userId, next);
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
