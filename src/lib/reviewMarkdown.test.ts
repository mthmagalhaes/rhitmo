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
