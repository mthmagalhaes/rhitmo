

## Plano: Continuar i18n — Corrigir crash + Migração SQL + UI + Strings

### Problema Urgente: App crashado

O `react-i18next` v17 e `i18next` v26 requerem React 19. O projeto usa React 18, causando o erro `Cannot read properties of null (reading 'useState')`. Preciso fazer downgrade:
- `react-i18next` → `^15.4.1` (última compatível com React 18)
- `i18next` → `^23.16.8` (estável para React 18)
- `i18next-browser-languagedetector` → `^8.0.4` (mantém compatível)

---

### Fase 2 — SQL + Admin locale por workspace

1. **Migração SQL**: Adicionar coluna `default_locale varchar default 'pt-BR'` à tabela `workspaces`
2. **AdminOverview.tsx**: Adicionar seletor de idioma padrão por workspace (dropdown PT-BR/EN/ES) na tabela de workspaces, visível apenas para super_admin. Salva via update na coluna `default_locale`

### Fase 3 — Seletor de idioma no perfil

**ProfileSettingsDialog.tsx**: Adicionar seção "Idioma" com 3 botões (🇧🇷🇺🇸🇪🇸) que chamam `useLocale().setLocale()`. Persiste no `user_metadata.locale` e `localStorage`.

### Fase 4 — Migração de strings (por batches)

Substituir strings hardcoded por `t('key')` nos principais arquivos, organizados por prioridade:

**Batch 1 — Core (alto impacto):**
- `Auth.tsx` (~30 strings: login, signup, esqueci senha, toasts)
- `AppSidebar.tsx` (~20 strings: menu items, labels, botões)
- `ProfileSettingsDialog.tsx` (~15 strings)
- `ResetPassword.tsx`

**Batch 2 — Dashboard:**
- `Index.tsx` (~40 strings: saudações, labels, botões, toasts)
- `SetupChecklist.tsx`, `ActivityPreview.tsx`, `NudgesBanner.tsx`
- `DirectReportDashboard.tsx`, `CareerCompassCard.tsx`, `SkillsMapCard.tsx`

**Batch 3 — Members + Feedback:**
- `TeamMemberCard.tsx`, `NewMemberDialog.tsx`, `EditMemberDialog.tsx`, `MemberDetails.tsx`
- `FeedbackTimeline.tsx`, `NewNoteDialog.tsx`, `BiasDetectionPanel.tsx`

**Batch 4 — Reviews + HR:**
- `PerformanceReviewList.tsx`, `NewReviewDialog.tsx`, `ReviewViewDialog.tsx`
- `HRDashboard.tsx`, `HRMembers.tsx`, `HRTeams.tsx`, `HRAnalytics.tsx`

**Batch 5 — Billing, Admin, Onboarding, Competências:**
- `Billing.tsx`, `UpgradeBanner.tsx`
- `AdminOverview.tsx`, `AdminUsers.tsx`, `AdminStructure.tsx`
- `OnboardingModal.tsx`, `WorkspaceOnboarding.tsx`, `RhitmoSync.tsx`, `LeaderSyncWizard.tsx`
- `CompetencyFramework.tsx`, competency components

**Batch 6 — Misc:**
- `MentorChat.tsx`, `MeetingRecorder.tsx`, `VoiceInput.tsx`, `GoalsManager.tsx`
- `Landing.tsx`, legal pages
- `date-fns` locale dinâmico (trocar `ptBR` hardcoded por locale baseado em `i18n.language`)

Também atualizarei os JSONs de tradução (`en.json`, `es.json`, `pt-BR.json`) conforme novas keys forem necessárias.

---

### Resumo

| Ação | Estimativa |
|------|-----------|
| Fix dependências (crash) | 1 arquivo |
| Migração SQL | 1 migration |
| Seletor no perfil | 1 arquivo |
| Admin locale | 1 arquivo |
| Migração de strings | ~50-60 arquivos + 3 JSONs |

Vou executar em ordem: fix crash → SQL → UI → strings batch a batch.

