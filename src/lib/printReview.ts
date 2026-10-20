// Exporta uma avaliação para PDF via diálogo de impressão do navegador.
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function printReview(opts: { title: string; content: string; memberName?: string; periodText?: string }): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  // Citações [doc:UUID] não fazem sentido no papel.
  const cleaned = opts.content.replace(/\s*\[doc:[0-9a-f-]{8,}\]/gi, '');
  const raw = cleaned.includes('</') ? cleaned : (marked.parse(cleaned) as string);
  const body = DOMPurify.sanitize(raw);
  w.document.write(`<!DOCTYPE html><html><head><title>${esc(opts.title)}</title>
<style>
@page{size:A4;margin:16mm}
body{font-family:Georgia,serif;color:#1f1d1a;line-height:1.6;max-width:720px;margin:0 auto}
h1{font-size:24px;margin:0 0 4px}
.meta{color:#6b6660;font-size:13px;margin-bottom:24px;border-bottom:1px solid #e5e0d8;padding-bottom:12px}
h2{font-size:18px;margin-top:24px}h3{font-size:15px}
li,p{break-inside:avoid}
</style></head><body>
<h1>${esc(opts.title)}</h1>
<div class="meta">${opts.memberName ? esc(opts.memberName) : ''}${opts.periodText ? ' · ' + esc(opts.periodText) : ''}</div>
${body}
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
  return true;
}
