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

export function isHtml(text: string): boolean {
  return /^\s*<(p|h[1-6]|ul|ol|div|blockquote)[\s>]/i.test(text || '');
}

export function markdownToEditorHtml(md: string): string {
  if (!md) return '';
  if (isHtml(md)) return md;
  return marked.parse(normalizeReviewHeadings(md), { async: false, gfm: true, breaks: false }) as string;
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
