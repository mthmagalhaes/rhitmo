// Sprint 8.2 — Visual chip rendered in place of `[doc:UUID]` markers from the AI.
// Click → dispatches a global window event that the singleton <EvidenceDrawer /> listens for.
import { FileText } from 'lucide-react';
import { useCitationIndex } from './CitationCounterProvider';

export const OPEN_EVIDENCE_EVENT = 'rhitmo:open-evidence';

export interface OpenEvidenceDetail {
  docId: string;
}

export function openEvidence(docId: string) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent<OpenEvidenceDetail>(OPEN_EVIDENCE_EVENT, {
    detail: { docId },
  });
  window.dispatchEvent(event);
}

interface CitationChipProps {
  docId: string;
}

export function CitationChip({ docId }: CitationChipProps) {
  const index = useCitationIndex(docId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openEvidence(docId);
      }}
      title="Ver evidência original"
      className="inline-flex items-center gap-1 mx-0.5 align-baseline
        rounded-full border border-primary/15 bg-primary/8
        px-1.5 py-0.5 text-[10.5px] font-medium leading-none
        text-primary/90 hover:text-primary
        hover:bg-primary/12 hover:border-primary/25
        hover:-translate-y-px transition-all
        shadow-[0_1px_4px_rgba(0,0,0,0.04)]
        focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <FileText className="h-2.5 w-2.5 flex-shrink-0" strokeWidth={2.5} />
      {index > 0 && <span>{index}</span>}
    </button>
  );
}
