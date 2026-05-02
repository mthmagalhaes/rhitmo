// Sprint 8.3 — Cross-member context evidence feed.
// Backed by the SECURITY DEFINER RPC `get_team_timeline`, which already enforces
// workspace + leader scoping. We just paginate by `occurred_at` cursor.
import { useInfiniteQuery } from '@tanstack/react-query';
import { safeRpc, SupabaseSafeError } from '@/lib/supabaseSafe';

export interface TimelineRow {
  id: string;
  member_id: string;
  member_name: string | null;
  member_avatar: string | null;
  evidence_type: string | null;
  source_table: string;
  source_id: string | null;
  occurred_at: string;
  title: string | null;
  summary: string | null;
  sentiment: string | null;
  visibility: string | null;
  metadata: Record<string, unknown> | null;
}

interface UseTeamTimelineOptions {
  workspaceId?: string | null;
  memberIds?: string[] | null;
  sourceTables?: string[] | null;
  pageSize?: number;
  enabled?: boolean;
}

const DEFAULT_PAGE_SIZE = 30;

export function useTeamTimeline({
  workspaceId,
  memberIds,
  sourceTables,
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
}: UseTeamTimelineOptions = {}) {
  const memberKey = memberIds && memberIds.length ? [...memberIds].sort().join(',') : null;
  const sourceKey = sourceTables && sourceTables.length ? [...sourceTables].sort().join(',') : null;

  return useInfiniteQuery({
    queryKey: ['team-timeline', workspaceId ?? null, memberKey, sourceKey, pageSize],
    enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      try {
        const rows = await safeRpc<TimelineRow[]>('get_team_timeline', {
          _workspace_id: workspaceId ?? null,
          _member_ids: memberIds && memberIds.length ? memberIds : null,
          _source_tables: sourceTables && sourceTables.length ? sourceTables : null,
          _before: pageParam,
          _limit: pageSize,
        });
        return rows ?? [];
      } catch (err) {
        // Defensive logging — useInfiniteQuery swallows the original message
        // into `isError` only, which made the Contexto bug invisible.
        if (import.meta.env.DEV) {
          const detail = err instanceof SupabaseSafeError ? err.message : String(err);
          console.error('[useTeamTimeline] get_team_timeline failed:', detail, err);
        }
        throw err;
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < pageSize) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last?.occurred_at ?? undefined;
    },
    staleTime: 30_000,
  });
}
