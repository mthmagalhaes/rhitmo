// Helpers de invalidação compartilhados.
// Centralizar evita o bug recorrente de invalidar uma key inexistente
// (ex: ['leader-members'] vs ['team-members-leader-scope']).
import type { QueryClient } from '@tanstack/react-query';

const LEADER_PEOPLE_KEYS = new Set<string>([
  'team-members-leader-scope',
  'workspace-teams-detail',
  'teams',
  'pending-invites',
  'suppressed-member-emails',
  'member-sync',
  'leader-members', // legado — mantido por segurança
]);

export function invalidateLeaderPeople(qc: QueryClient) {
  qc.invalidateQueries({
    predicate: (q) => {
      const head = q.queryKey?.[0];
      return typeof head === 'string' && LEADER_PEOPLE_KEYS.has(head);
    },
  });
}
