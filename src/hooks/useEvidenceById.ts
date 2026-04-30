// Sprint 8.2 — Loads a single context_evidence row + its raw source content for the EvidenceDrawer.
//
// Lookup is permissive: the `docId` may be either:
//   1. context_evidence.id (preferred, what the AI is being trained to cite)
//   2. source_id of any source_table (legacy IDs of feedbacks, transcripts, etc.)
//
// RLS does the security work — we never bypass it.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EvidenceData {
  id: string;
  member_id: string;
  source_table: string;
  source_id: string;
  evidence_type: string;
  occurred_at: string;
  title: string | null;
  summary: string | null;
  visibility: string;
  metadata: Record<string, unknown>;
}

export interface FullEvidence {
  evidence: EvidenceData;
  /** Original full text (transcript, note content, slack message, etc.). null if not accessible. */
  fullContent: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadEvidenceRow(docId: string): Promise<EvidenceData | null> {
  // 1) Try direct lookup by context_evidence.id
  const direct = await supabase
    .from('context_evidence')
    .select('id, member_id, source_table, source_id, evidence_type, occurred_at, title, summary, visibility, metadata')
    .eq('id', docId)
    .maybeSingle();

  if (direct.data) return direct.data as EvidenceData;

  // 2) Fallback: lookup by source_id (the AI may cite legacy IDs like feedbacks.id)
  const fallback = await supabase
    .from('context_evidence')
    .select('id, member_id, source_table, source_id, evidence_type, occurred_at, title, summary, visibility, metadata')
    .eq('source_id', docId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (fallback.data as EvidenceData) ?? null;
}

async function loadFullContent(ev: EvidenceData): Promise<string | null> {
  const id = ev.source_id;
  try {
    switch (ev.source_table) {
      case 'feedbacks': {
        const { data } = await supabase.from('feedbacks').select('content').eq('id', id).maybeSingle();
        return (data as { content?: string } | null)?.content ?? null;
      }
      case 'meeting_transcripts': {
        const { data } = await supabase
          .from('meeting_transcripts')
          .select('transcript, leader_notes')
          .eq('id', id)
          .maybeSingle();
        const row = data as { transcript?: string; leader_notes?: string } | null;
        return row?.transcript ?? row?.leader_notes ?? null;
      }
      case 'slack_ambient_evidence': {
        const { data } = await supabase
          .from('slack_ambient_evidence')
          .select('message_text, summary')
          .eq('id', id)
          .maybeSingle();
        const row = data as { message_text?: string; summary?: string } | null;
        return row?.message_text ?? row?.summary ?? null;
      }
      case 'kudos': {
        const { data } = await supabase.from('kudos').select('message').eq('id', id).maybeSingle();
        return (data as { message?: string } | null)?.message ?? null;
      }
      case 'member_prompts': {
        const { data } = await supabase
          .from('member_prompts')
          .select('prompt_text, response')
          .eq('id', id)
          .maybeSingle();
        const row = data as { prompt_text?: string; response?: string } | null;
        if (!row) return null;
        return [row.prompt_text, row.response].filter(Boolean).join('\n\n— Resposta —\n');
      }
      case 'goals': {
        const { data } = await supabase
          .from('goals')
          .select('title, description')
          .eq('id', id)
          .maybeSingle();
        const row = data as { title?: string; description?: string } | null;
        if (!row) return null;
        return [row.title, row.description].filter(Boolean).join('\n\n');
      }
      case 'performance_reviews': {
        const { data } = await supabase
          .from('performance_reviews')
          .select('content')
          .eq('id', id)
          .maybeSingle();
        return (data as { content?: string } | null)?.content ?? null;
      }
      case 'leader_nudges': {
        const { data } = await supabase
          .from('leader_nudges')
          .select('message')
          .eq('id', id)
          .maybeSingle();
        return (data as { message?: string } | null)?.message ?? null;
      }
      default:
        return null;
    }
  } catch {
    return null; // RLS or schema mismatch — fall back to summary.
  }
}

export function useEvidenceById(docId: string | null) {
  return useQuery<FullEvidence | null>({
    queryKey: ['evidence', docId],
    enabled: !!docId && (UUID_RE.test(docId ?? '') || true),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!docId) return null;
      const ev = await loadEvidenceRow(docId);
      if (!ev) return null;
      const fullContent = await loadFullContent(ev);
      return { evidence: ev, fullContent };
    },
  });
}
