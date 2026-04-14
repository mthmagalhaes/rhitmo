

## Plano: i18n Batch 2 — Migrar strings nos 8 componentes do Dashboard

A infraestrutura está estável. Agora vou substituir as strings hardcoded por `t()` nos seguintes arquivos:

### Arquivos e mudanças

| # | Arquivo | Mudanças principais |
|---|---------|-------------------|
| 1 | `src/pages/Index.tsx` | `getGreeting()` → `t('dashboard.greeting.*')`, labels, botões, plurals, date-fns locale dinâmico |
| 2 | `src/components/SetupChecklist.tsx` | Step labels, botões de ação, texto de progresso |
| 3 | `src/components/ActivityPreview.tsx` | Título de seção, empty state, time labels, date-fns locale |
| 4 | `src/components/NudgesBanner.tsx` | Button labels, sr-only text |
| 5 | `src/components/dashboard/DirectReportDashboard.tsx` | `tenureLabels`, `chronotypeLabels`, `feedbackStyleLabels`, `recognitionStyleLabels`, maps de contexto, tab names, headers, botões, toasts |
| 6 | `src/components/dashboard/SkillsMapCard.tsx` | Headers, empty state, score labels, tips |
| 7 | `src/components/dashboard/CareerCompassCard.tsx` | Headers, score labels, section titles |
| 8 | `src/components/TeamMemberCard.tsx` | Status messages, tooltips, relative time labels |

### Approach

- Import `useTranslation` + `getDateLocale` in each file
- Replace every Portuguese string with the corresponding `t('key')` using keys already added to the JSONs
- Add any missing keys found during migration to all 3 locale files
- Use `getDateLocale(i18n.language)` wherever `date-fns` `format`/`formatDistanceToNow` is used

### Execution

Process all 8 files + update JSONs as needed. No new dependencies or migrations required.

