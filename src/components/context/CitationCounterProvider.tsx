// Sprint 8.2 — Per-message citation numbering.
// Each AI bubble or review section wraps its <ReactMarkdown> in this provider so that
// CitationChip components inside receive a sequential index starting at 1.
import React, { createContext, useContext, useRef } from 'react';

interface CitationCounterAPI {
  /** Returns the visual index for a given docId. Same docId → same index within the same provider scope. */
  getIndex(docId: string): number;
}

const Ctx = createContext<CitationCounterAPI | null>(null);

export function CitationCounterProvider({ children }: { children: React.ReactNode }) {
  // Fresh map per render scope. `useRef` keeps it stable across re-renders of the same message.
  const mapRef = useRef<Map<string, number>>(new Map());

  const api: CitationCounterAPI = {
    getIndex(docId: string) {
      const map = mapRef.current;
      const existing = map.get(docId);
      if (existing) return existing;
      const next = map.size + 1;
      map.set(docId, next);
      return next;
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCitationIndex(docId: string): number {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback — no provider mounted. Return 0 so the chip shows just the icon.
    return 0;
  }
  return ctx.getIndex(docId);
}
