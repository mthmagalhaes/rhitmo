// @ts-nocheck — run with: bun test src/lib/reviewMarkdown.test.ts
import { describe, it, expect } from 'bun:test';
import { markdownToEditorHtml, editorHtmlToMarkdown } from './reviewMarkdown';

describe('review markdown round-trip', () => {
  const md = '## Visão geral\n\nTexto com **destaque** e fonte [doc:1234abcd-0000-1111-2222-333344445555].\n\n* item um\n* item _dois_';

  it('keeps citations intact', () => {
    const back = editorHtmlToMarkdown(markdownToEditorHtml(md));
    expect(back).toContain('[doc:1234abcd-0000-1111-2222-333344445555]');
  });

  it('keeps headings, bold and lists', () => {
    const back = editorHtmlToMarkdown(markdownToEditorHtml(md));
    expect(back).toContain('## Visão geral');
    expect(back).toContain('**destaque**');
    expect(back).toMatch(/^\*\s+item um/m);
  });
});

import { normalizeReviewHeadings } from './reviewMarkdown';
describe('normalizeReviewHeadings', () => {
  const long = '### Parceria — Atende as expectativas. No período avaliado, Laís demonstrou parceria ao manter alinhamento [doc:1234abcd-0000-1111-2222-333344445555].';
  it('splits long heading', () => {
    expect(normalizeReviewHeadings(long)).toBe('### Parceria — Atende as expectativas\n\nNo período avaliado, Laís demonstrou parceria ao manter alinhamento [doc:1234abcd-0000-1111-2222-333344445555].');
  });
  it('keeps short heading', () => { expect(normalizeReviewHeadings('## Visão geral')).toBe('## Visão geral'); });
  it('is idempotent', () => { const a = normalizeReviewHeadings(long); expect(normalizeReviewHeadings(a)).toBe(a); });
});
describe('italic level', () => {
  it('splits after italic level', () => {
    const s = '### Parceria — _Atende as expectativas._ No período avaliado, Laís demonstrou parceria ao manter alinhamento frequente.';
    expect(normalizeReviewHeadings(s)).toBe('### Parceria — _Atende as expectativas_\n\nNo período avaliado, Laís demonstrou parceria ao manter alinhamento frequente.');
  });
});

import { normalizeLegacyReviewHtml as nl, looksLikeHtml as lh } from './reviewMarkdown';
it('legacy html: lone bold paragraph becomes heading, empty p removed', () => {
  expect(nl('<p><strong>Entregas</strong></p><p></p><p>Texto</p>')).toBe('<h3>Entregas</h3><p>Texto</p>');
  expect(lh('## Título\n\nTexto')).toBe(false);
});
