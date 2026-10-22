// Markdown <-> HTML for editing formal reviews in the rich editor while keeping
// the stored format (Markdown with `[doc:UUID]` citations) unchanged.
import { marked } from 'marked';
import TurndownService from 'turndown';

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '*',
  emDelimiter: '_',
  strongDelimiter: '**',
});
// Keep citation markers literal (turndown would escape the brackets).
td.escape = ((s: string) => s) as any;
td.addRule('citation', {
  filter: (node: any) => node.nodeName === 'SPAN' && node.getAttribute?.('data-citation'),
  replacement: (_c: string, node: any) => `[doc:${node.getAttribute('data-citation')}]`,
});

const CITE_RE = /\[doc:([0-9a-f-]{8,})\]/gi;
function citationsToSpans(html: string): string {
  return html.replace(CITE_RE, (_m, id) => `<span data-citation="${id}">evidência</span>`);
}

export function isHtml(text: string): boolean {
  return /^\s*<(p|h[1-6]|ul|ol|div|blockquote)[\s>]/i.test(text || '');
}

// Legacy reviews were stored as HTML (sometimes with stray tags mid-text).
export function looksLikeHtml(text: string): boolean {
  return isHtml(text) || /<\/(p|h[1-6]|li|ul|ol|strong|em)>/i.test(text || '');
}

// Legacy HTML: lone bold paragraphs become headings; empty paragraphs removed.
export function normalizeLegacyReviewHtml(html: string): string {
  if (!html) return html;
  return html
    .replace(/<p>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, '')
    .replace(/<p>\s*<strong>([^<]{1,120})<\/strong>\s*:?\s*<\/p>/gi, '<h3>$1</h3>');
}

export function markdownToEditorHtml(md: string): string {
  if (!md) return '';
  if (looksLikeHtml(md)) return citationsToSpans(normalizeLegacyReviewHtml(md));
  return citationsToSpans(marked.parse(normalizeReviewHeadings(md), { async: false, gfm: true, breaks: false }) as string);
}

export function editorHtmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  return td.turndown(html).replace(/\n{3,}/g, '\n\n').trim();
}

// Split headings where the AI glued the paragraph onto the title line
// ("### Valor — Nível. Texto corrido...") into heading + paragraph. Idempotent.
export function normalizeReviewHeadings(md: string): string {
  if (!md) return md;
  return md.replace(/^(#{2,4})[ \t]+(.+)$/gm, (line, hashes: string, body: string) => {
    if (body.length <= 90) return line;
    const dash = body.search(/\s[—–-]\s/);
    const from = dash >= 0 ? dash + 3 : 0;
    const m = /([.:][_*]*)\s+\S/.exec(body.slice(from));
    const rel = m ? m.index : -1;
    if (rel < 0) return line;
    const cut = from + rel;
    const title = body.slice(0, cut).trim() + (m![1].slice(1));
    const rest = body.slice(cut + m![1].length).trim();
    if (!title || !rest) return line;
    return `${hashes} ${title}\n\n${rest}`;
  });
}
