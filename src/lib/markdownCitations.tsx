// Sprint 8.2 — Helpers to parse `[doc:UUID]` markers inside react-markdown rendered nodes
// and replace them with <CitationChip />.
//
// Strategy: we override the leaf-ish elements (p, li, td, em, strong) and walk their children,
// splitting any string child on the regex. Non-string children pass through unchanged.
import React from 'react';
import { CitationChip } from '@/components/context/CitationChip';

const DOC_RE = /\[doc:([0-9a-f-]{8,})\]/gi;

/** Walk children recursively and substitute `[doc:UUID]` strings with <CitationChip /> nodes. */
function replaceCitations(children: React.ReactNode, keyPrefix = 'c'): React.ReactNode {
  if (children == null || typeof children === 'boolean') return children;

  if (typeof children === 'string' || typeof children === 'number') {
    const text = String(children);
    if (!DOC_RE.test(text)) return text;
    DOC_RE.lastIndex = 0;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = DOC_RE.exec(text)) !== null) {
      const [full, uuid] = match;
      const start = match.index;
      if (start > lastIndex) parts.push(text.slice(lastIndex, start));
      parts.push(<CitationChip key={`${keyPrefix}-${i++}`} docId={uuid} />);
      lastIndex = start + full.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    DOC_RE.lastIndex = 0;
    return parts;
  }

  if (Array.isArray(children)) {
    return children.map((child, idx) => (
      <React.Fragment key={`${keyPrefix}-${idx}`}>
        {replaceCitations(child, `${keyPrefix}-${idx}`)}
      </React.Fragment>
    ));
  }

  if (React.isValidElement(children)) {
    const childProps = children.props as { children?: React.ReactNode };
    const inner = childProps?.children;
    if (inner == null) return children;
    return React.cloneElement(
      children,
      undefined,
      replaceCitations(inner, keyPrefix),
    );
  }

  return children;
}

/** react-markdown components map that intercepts text-bearing leafs and renders citation chips. */
export const citationMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="leading-relaxed mb-3.5 last:mb-0">{replaceCitations(children, 'p')}</p>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{replaceCitations(children, 'li')}</li>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td>{replaceCitations(children, 'td')}</td>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{replaceCitations(children, 'st')}</strong>
  ),
};
