import { useAccount } from '@/contexts/AccountContext';
import { useActiveMode } from '@/hooks/useActiveMode';
import { resolvePersona, type SidebarPersona } from '@/lib/navigation';

/**
 * Persona resolvida (leader | hr_admin | direct_report) considerando os
 * papéis reais do usuário E o modo ativo escolhido no WorkspaceSwitcher.
 *
 * Use isto em vez de `isLinkedMember` isolado: desde que líder e liderado
 * podem coexistir na mesma conta, "tem vínculo" não significa mais
 * "está na visão de liderado".
 */
export function usePersona(): SidebarPersona {
  const { isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner, isTeamLeader } = useAccount();
  const { mode: activeMode } = useActiveMode();
  return resolvePersona({ isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner, isTeamLeader, activeMode });
}
