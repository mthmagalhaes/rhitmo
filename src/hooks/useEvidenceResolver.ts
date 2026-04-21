import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EvidenceRef {
  feedback_id?: string;
  meeting_id?: string;
  date: string;
}

export interface ResolvedEvidence {
  key: string;
  type: 'feedback' | 'meeting';
  id: string;
  label: string;
  date: string;
  found: boolean;
}

/** Pega os primeiros ~70 chars úteis do conteúdo, sem quebras de linha. */
function shortLabel(raw: string | null | undefined, fallback: string, max = 70): string {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Resolve uma lista de evidências (UUIDs) em rótulos legíveis.
 * Faz no máx. 2 queries (uma p/ feedbacks, uma p/ meetings).
 */
export function useEvidenceResolver(evidence: EvidenceRef[] | null | undefined) {
  const refs = Array.isArray(evidence) ? evidence : [];
  const feedbackIds = Array.from(
    new Set(refs.map((e) => e.feedback_id).filter((x): x is string => !!x))
  ).sort();
  const meetingIds = Array.from(
    new Set(refs.map((e) => e.meeting_id).filter((x): x is string => !!x))
  ).sort();

  const enabled = feedbackIds.length + meetingIds.length > 0;

  return useQuery({
    queryKey: ['evidence-resolver', feedbackIds, meetingIds],
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<ResolvedEvidence[]> => {
      const [fbRes, mtRes] = await Promise.all([
        feedbackIds.length
          ? supabase
              .from('feedbacks')
              .select('id, content, summary, occurred_at')
              .in('id', feedbackIds)
          : Promise.resolve({ data: [] as any[], error: null } as const),
        meetingIds.length
          ? supabase
              .from('meeting_transcripts')
              .select('id, leader_notes, transcript, created_at')
              .in('id', meetingIds)
          : Promise.resolve({ data: [] as any[], error: null } as const),
      ]);

      const fbMap = new Map<string, any>();
      for (const f of (fbRes.data ?? []) as any[]) fbMap.set(f.id, f);
      const mtMap = new Map<string, any>();
      for (const m of (mtRes.data ?? []) as any[]) mtMap.set(m.id, m);

      const resolved: ResolvedEvidence[] = [];
      for (const ref of refs) {
        if (ref.feedback_id) {
          const f = fbMap.get(ref.feedback_id);
          resolved.push({
            key: `f:${ref.feedback_id}`,
            type: 'feedback',
            id: ref.feedback_id,
            date: ref.date || (f?.occurred_at?.slice(0, 10) ?? ''),
            label: shortLabel(f?.summary || f?.content, 'Anotação'),
            found: !!f,
          });
        } else if (ref.meeting_id) {
          const m = mtMap.get(ref.meeting_id);
          resolved.push({
            key: `m:${ref.meeting_id}`,
            type: 'meeting',
            id: ref.meeting_id,
            date: ref.date || (m?.created_at?.slice(0, 10) ?? ''),
            label: shortLabel(m?.leader_notes || m?.transcript, '1:1'),
            found: !!m,
          });
        }
      }
      // dedup by key, mantendo a primeira
      const seen = new Set<string>();
      return resolved.filter((r) => {
        if (seen.has(r.key)) return false;
        seen.add(r.key);
        return true;
      });
    },
  });
}
