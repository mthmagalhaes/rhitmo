/**
 * Templates de Nota — reduzem fricção da página em branco no NewNoteDialog.
 * Cada template gera HTML compatível com o Tiptap (RichTextEditor).
 *
 * Princípio: cabeçalhos curtos + 1 prompt em itálico para guiar o líder.
 */

export type NoteTemplateId = 'blank' | 'one_on_one' | 'post_project' | 'difficult_feedback';

export interface NoteTemplate {
  id: NoteTemplateId;
  labelKey: string;        // i18n key, e.g. 'newNote.templates.oneOnOne'
  descriptionKey: string;  // i18n key, e.g. 'newNote.templates.oneOnOneDesc'
  emoji: string;
  /** Returns the HTML body to load into the editor. Empty string for "blank". */
  buildHtml: (t: (key: string) => string) => string;
  /** Optional default tags to pre-fill */
  defaultTags?: string[];
  /** Optional default title */
  buildTitle?: (t: (key: string) => string) => string | null;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    labelKey: 'newNote.templates.blank',
    descriptionKey: 'newNote.templates.blankDesc',
    emoji: '📝',
    buildHtml: () => '',
  },
  {
    id: 'one_on_one',
    labelKey: 'newNote.templates.oneOnOne',
    descriptionKey: 'newNote.templates.oneOnOneDesc',
    emoji: '☕',
    buildTitle: (t) => t('newNote.templates.oneOnOneTitle'),
    defaultTags: ['1:1'],
    buildHtml: (t) => `
<h3>${t('newNote.templates.sections.howAreYou')}</h3>
<p><em>${t('newNote.templates.prompts.howAreYou')}</em></p>
<h3>${t('newNote.templates.sections.progress')}</h3>
<p><em>${t('newNote.templates.prompts.progress')}</em></p>
<h3>${t('newNote.templates.sections.blockers')}</h3>
<p><em>${t('newNote.templates.prompts.blockers')}</em></p>
<h3>${t('newNote.templates.sections.nextSteps')}</h3>
<p><em>${t('newNote.templates.prompts.nextSteps')}</em></p>
`.trim(),
  },
  {
    id: 'post_project',
    labelKey: 'newNote.templates.postProject',
    descriptionKey: 'newNote.templates.postProjectDesc',
    emoji: '🚀',
    buildTitle: (t) => t('newNote.templates.postProjectTitle'),
    defaultTags: ['Conquista 🏆'],
    buildHtml: (t) => `
<h3>${t('newNote.templates.sections.context')}</h3>
<p><em>${t('newNote.templates.prompts.projectContext')}</em></p>
<h3>${t('newNote.templates.sections.contribution')}</h3>
<p><em>${t('newNote.templates.prompts.contribution')}</em></p>
<h3>${t('newNote.templates.sections.impact')}</h3>
<p><em>${t('newNote.templates.prompts.impact')}</em></p>
<h3>${t('newNote.templates.sections.learning')}</h3>
<p><em>${t('newNote.templates.prompts.learning')}</em></p>
`.trim(),
  },
  {
    id: 'difficult_feedback',
    labelKey: 'newNote.templates.difficultFeedback',
    descriptionKey: 'newNote.templates.difficultFeedbackDesc',
    emoji: '⚠️',
    buildTitle: (t) => t('newNote.templates.difficultFeedbackTitle'),
    defaultTags: ['Oportunidade de Melhoria ⚠️'],
    buildHtml: (t) => `
<h3>${t('newNote.templates.sections.situation')}</h3>
<p><em>${t('newNote.templates.prompts.situation')}</em></p>
<h3>${t('newNote.templates.sections.behavior')}</h3>
<p><em>${t('newNote.templates.prompts.behavior')}</em></p>
<h3>${t('newNote.templates.sections.impactObserved')}</h3>
<p><em>${t('newNote.templates.prompts.impactObserved')}</em></p>
<h3>${t('newNote.templates.sections.expectation')}</h3>
<p><em>${t('newNote.templates.prompts.expectation')}</em></p>
`.trim(),
  },
];

export const getTemplateById = (id: NoteTemplateId): NoteTemplate | undefined =>
  NOTE_TEMPLATES.find((t) => t.id === id);
