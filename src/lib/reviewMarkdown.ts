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
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}

export function editorHtmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  return td.turndown(html).replace(/\n{3,}/g, '\n\n').trim();
}
