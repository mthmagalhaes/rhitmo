import { useCallback, useSyncExternalStore } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { useEffectiveUser } from './useEffectiveUser';

export type ActiveMode = 'leader' | 'company' | 'member';

const STORAGE_PREFIX = 'rhitmo:active-mode:';

function storageKey(userId: string | null): string | null {
  return userId ? `${STORAGE_PREFIX}${userId}` : null;
}

function readStored(userId: string | null): ActiveMode | null {
  const key = storageKey(userId);
  if (!key) return null;
  try {
    const v = window.localStorage.getItem(key);
    return v === 'leader' || v === 'company' || v === 'member' ? v : null;
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
  const { loading: accountLoading, isTeamLeader, isHRAdmin, isWorkspaceOwner, isLinkedMember } = useAccount();

  // canSeeLeader = "lidera ao menos um time" (vem do RPC
  // get_account_context.is_team_leader). Independe de papel HR/Owner — um HR
  // Admin que também lidera um time deve ver os dois modos.
  const canSeeLeader = isTeamLeader;
  const canSeeCompany = isHRAdmin || isWorkspaceOwner;
  // canSeeMember = "é liderado de alguém" — só vira um modo à parte quando a
  // pessoa também tem chapéu de líder ou de empresa; liderado puro já cai
  // direto na persona direct_report.
  const canSeeMember = isLinkedMember && (canSeeLeader || canSeeCompany);

  const availableModes: ActiveMode[] = [];
  if (canSeeLeader) availableModes.push('leader');
  if (canSeeCompany) availableModes.push('company');
  if (canSeeMember) availableModes.push('member');
  if (availableModes.length === 0) availableModes.push('leader');

  const defaultMode: ActiveMode = availableModes.includes('leader') ? 'leader' : availableModes[0];

  const isAllowed = (m: ActiveMode) =>
    m === 'leader' ? canSeeLeader : m === 'company' ? canSeeCompany : canSeeMember;

  // Hidrata o store a partir do localStorage assim que conhecemos o userId.
  // IMPORTANTE: enquanto o AccountContext carrega, os flags de papel ainda são
  // falsos (isTeamLeader/isLinkedMember). Normalizar aqui descartaria o modo
  // 'member' salvo e jogaria o usuário de volta pra visão de líder a cada
  // reload. Por isso só validamos depois que o contexto resolve.
  const key = userId ?? '__anon__';
  const stored = readStored(userId);
  if (!accountLoading) {
    if (!modeByUser.has(key)) {
      const valid = stored && isAllowed(stored);
      modeByUser.set(key, valid ? (stored as ActiveMode) : defaultMode);
    } else {
      // Se o modo armazenado deixou de ser válido (papéis mudaram), normaliza.
      const current = modeByUser.get(key)!;
      if (!isAllowed(current)) {
        modeByUser.set(key, defaultMode);
      }
    }
  }

  // Enquanto carrega, o valor persistido é a melhor aposta (otimista).
  const fallbackMode: ActiveMode = accountLoading ? (stored ?? defaultMode) : defaultMode;

  const mode = useSyncExternalStore(
    subscribe,
    () => getSnapshot(userId, fallbackMode),
    () => fallbackMode,
  );

  const setMode = useCallback(
    (next: ActiveMode) => {
      const allowed =
        next === 'leader' ? canSeeLeader : next === 'company' ? canSeeCompany : canSeeMember;
      if (!allowed) return;
      writeMode(userId, next);
    },
    [userId, canSeeLeader, canSeeCompany, canSeeMember],
  );

  return {
    mode,
    setMode,
    availableModes,
    canSwitch: availableModes.length > 1,
  };
}
