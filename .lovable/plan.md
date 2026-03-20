

## Plan: AI-Powered Competency Adjustment

### Summary
Add an "Ajustar com IA" feature: an edge function that refines competency descriptions based on job context, and a dialog component integrated into the roles view cards.

### Changes

**1. Edge Function `supabase/functions/adjust-competency/index.ts`**

Follow the same pattern as `generate-competencies`:
- CORS headers, auth via `getUser(token)`, rate limit/402 error handling
- Accept: `competency_name`, `competency_description`, `job_title`, `level`, `adjustment_type` (more_specific | more_generic | adjust_level | custom), `custom_prompt`
- Build prompt per adjustment type, call Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Use tool calling (`return_adjusted_competency`) to get structured `{name, description}` response
- Return adjusted competency JSON

**2. New component `src/components/competency/AdjustCompetencyDialog.tsx`**

Dialog with:
- Current competency display (name, description, job context)
- 3 quick-action buttons: "Mais específico", "Mais genérico", "Ajustar para nível X"
- Custom prompt textarea + "Ajustar com IA" button
- After AI responds: preview card with adjusted result, "Ajustar novamente" and "Usar esta versão" buttons
- On "Usar esta versão": update `competencies` table description, then invalidate queries

**3. Update `src/pages/CompetencyFramework.tsx`**

- Add state: `adjustingCompetency`, `adjustDialogOpen`
- Import `Sparkles` icon
- In roles view competency rows (lines 361-377): add "Ajustar" ghost button with Sparkles icon
- On click: set adjusting competency context (id, name, description, role title, role level)
- Add mutation to update competency description in DB after AI adjustment
- Render `AdjustCompetencyDialog` at bottom

**4. Config: `supabase/config.toml`**

Add `[functions.adjust-competency]` with `verify_jwt = false` (auth handled in code, same as `generate-competencies`).

### No database changes needed
The adjustment updates existing `competencies.description` via standard Supabase client update.

