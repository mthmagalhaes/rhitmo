

## Plano: i18n Batch 2 — Dashboard, SetupChecklist, ActivityPreview, NudgesBanner, DirectReportDashboard, SkillsMapCard, CareerCompassCard, TeamMemberCard

This batch migrates all hardcoded Portuguese strings in the dashboard layer (both leader and direct report views) to use `t()` from react-i18next.

---

### Files to modify

| File | Estimated strings |
|------|------------------|
| `src/pages/Index.tsx` | ~40 (greetings, labels, buttons, tooltips, plurals) |
| `src/components/SetupChecklist.tsx` | ~8 (step labels, action buttons, progress text) |
| `src/components/ActivityPreview.tsx` | ~6 (section title, empty state, time labels) |
| `src/components/NudgesBanner.tsx` | ~3 (button labels, sr-only) |
| `src/components/dashboard/DirectReportDashboard.tsx` | ~60+ (tenure/chronotype/feedback/recognition labels, tab names, section headers, buttons, toasts) |
| `src/components/dashboard/SkillsMapCard.tsx` | ~15 (headers, empty state, buttons, tips) |
| `src/components/dashboard/CareerCompassCard.tsx` | ~10 (headers, score labels, section titles) |
| `src/components/TeamMemberCard.tsx` | ~8 (status messages, tooltips, labels) |

### Key changes

1. **`Index.tsx`**: Replace `getGreeting()` with `t('dashboard.greeting.morning/afternoon/evening')`. Replace all inline Portuguese (liderado/reunião/nota plurals, button labels, section headers, empty states) with `t()` calls. Replace `ptBR` date-fns locale with dynamic locale based on `i18n.language`.

2. **`DirectReportDashboard.tsx`**: The `tenureLabels`, `chronotypeLabels`, `feedbackStyleLabels`, `recognitionStyleLabels`, `chronotypeContext`, `feedbackContext`, `recognitionContext` maps all contain Portuguese. Convert to `t()` keys. Tab labels (Visão Geral, Feedbacks, Avaliações, etc.) all need translation. All toasts, buttons, section headers.

3. **`SkillsMapCard.tsx` + `CareerCompassCard.tsx`**: Headers ("Bússola de Carreira"), empty states, score labels ("Excelente alinhamento"), section titles ("Pontos de Atenção", "Foco Recomendado"), action buttons.

4. **`TeamMemberCard.tsx`**: Status messages ("Sem notas", "Hoje", "Há X dias"), tooltips.

5. **Locale JSONs**: Add all new keys to `pt-BR.json`, `en.json`, `es.json` under existing namespaces (`dashboard`, `setup`, `common`, plus new `directReport` namespace).

6. **date-fns dynamic locale**: Create a helper `getDateLocale(lang)` that returns the correct `date-fns/locale` object, used in `Index.tsx`, `ActivityPreview.tsx`, and `DirectReportDashboard.tsx`.

### Execution order

1. Add all new translation keys to the 3 JSON files
2. Create `src/lib/dateLocale.ts` helper for dynamic date-fns locale
3. Migrate `Index.tsx` (largest file)
4. Migrate `SetupChecklist.tsx`, `ActivityPreview.tsx`, `NudgesBanner.tsx`
5. Migrate `DirectReportDashboard.tsx` (second largest)
6. Migrate `SkillsMapCard.tsx`, `CareerCompassCard.tsx`, `TeamMemberCard.tsx`

