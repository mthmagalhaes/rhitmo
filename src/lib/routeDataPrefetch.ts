// Prefetch de DADOS por rota (o prefetch de código vive em routeLoaders.ts).
//
// Ao passar o mouse/foco sobre um item do menu, aquecemos as queries que a
// próxima tela vai pedir. Como as chaves são as mesmas do hook, a página abre
// com os dados já em cache — sem o skeleton cinza a cada navegação.
import type { QueryClient } from '@tanstack/react-query';
import {
  leaderWorkspaceQuery,
  leaderTeamsQuery,
  leaderMembersQuery,
} from '@/hooks/useLeaderMembers';

const LEADER_ROUTES = new Set([
  '/lider/inicio',
  '/lider/1on1s',
  '/lider/diario',
  '/lider/avaliacoes',
  '/lider/calibracao',
  '/lider/pessoas',
  '/lider/contexto',
]);

const inflight = new Set<string>();

/** Aquece a cadeia workspace → times → liderados usada por todas as telas de líder. */
async function prefetchLeaderScope(
  qc: QueryClient,
  effectiveUserId: string,
  includeArchived: boolean,
) {
  const wsQuery = leaderWorkspaceQuery(effectiveUserId);
  await qc.prefetchQuery(wsQuery);
  const workspace = qc.getQueryData<{ id: string } | null>(wsQuery.queryKey);
  if (!workspace?.id) return;

  const teamsQuery = leaderTeamsQuery(workspace.id, effectiveUserId);
  await qc.prefetchQuery(teamsQuery);
  const teams = qc.getQueryData<Array<{ id: string }>>(teamsQuery.queryKey) ?? [];
  if (teams.length === 0) return;

  await qc.prefetchQuery(
    leaderMembersQuery(workspace.id, teams.map((t) => t.id), effectiveUserId, includeArchived),
  );
}

export function prefetchRouteData(
  qc: QueryClient,
  path: string,
  effectiveUserId: string | null | undefined,
): void {
  if (!effectiveUserId || !LEADER_ROUTES.has(path)) return;
  // /lider/pessoas pode listar arquivados; as demais telas usam só os ativos.
  const includeArchived = path === '/lider/pessoas';
  const key = `${path}:${effectiveUserId}:${includeArchived}`;
  if (inflight.has(key)) return;
  inflight.add(key);
  prefetchLeaderScope(qc, effectiveUserId, includeArchived)
    .catch(() => undefined)
    .finally(() => {
      // Libera após um tempo para permitir reaquecer numa sessão longa.
      setTimeout(() => inflight.delete(key), 60_000);
    });
}
