

## Plan: Redesign Competency Framework — Cargo-Centric with 3 Source Options

### Summary
Remove "Por Competência" as main view, replace with discrete "Biblioteca" tab, redesign CreateJobRoleDialog with 3-step flow (details → source → competencies), and update AI to generate 3-5 competencies instead of 7.

### Changes

**1. `supabase/functions/generate-competencies/index.ts`** — Update prompt

Change line 55 from "Gere 7 competências" to "Gere entre 3 e 5 competências comportamentais ESSENCIAIS". Update system prompt to emphasize "menos é mais" and "3-5 competências CORE que diferenciam performance". Keep all other logic (tool calling, CORS, auth) unchanged.

**2. `src/components/competency/CreateJobRoleDialog.tsx`** — Add source selection step + AI generation + manual creation

Major rewrite:
- Add step `'source'` between `'details'` and `'competencies'`
- **Source step**: 3 cards (Gerar com IA / Importar Template / Criar Manualmente) using `Card` + icons (`Sparkles`, `Building2`, `Pencil`)
- **AI flow**: On "Gerar com IA" → show loading → call `generate-competencies` edge function → populate `selectedCompetencies` with results → go to competencies step for review (cards with X to remove)
- **Manual flow**: Go to competencies step showing existing competencies as checkboxes (current behavior) + inline "Criar Nova Competência" form at top
- **Template flow**: Placeholder for now (toast "Em breve")
- Add new props: `workspaceId` (for auto-creating framework if needed)
- Add states: `competencySource`, `isGeneratingAI`, `isCreatingNewCompetency`, `newCompetencyName/Description/ExpectedLevel`
- Save mutation: if AI-generated competencies, first insert them into `competencies` table, then create `role_competencies` associations (same pattern as AICompetencyDialog)

**3. `src/pages/CompetencyFramework.tsx`** — Replace toggle + add Biblioteca view

- Change `viewMode` type from `'roles' | 'competencies'` to `'roles' | 'library'`
- Replace the prominent toggle (lines 286-303) with a discrete right-aligned text toggle: "Meus Cargos" | "Biblioteca"
- Remove "Por Competência" view (lines 410-441) — replace with "Biblioteca" view showing competencies with usage count badges and edit/delete buttons
- Add query for library view: fetch competencies with `role_competencies(count)` and `competency_level_descriptions(count)` aggregations
- Header button: always show "Adicionar Cargo" (remove conditional for "Adicionar Competência")
- Remove `showAIDialog` state and `AICompetencyDialog` render (AI generation now lives inside CreateJobRoleDialog)
- Pass `workspaceId` to `CreateJobRoleDialog`
- Keep: EditCompetencyModal, AdjustCompetencyDialog, AlertDialog for delete

**4. No database changes needed**

### Technical Notes
- AI-generated competencies in the dialog need to be inserted into `competencies` table first (with proper `framework_id` and `order`), then linked via `role_competencies` — reuse the same pattern from `AICompetencyDialog.saveAll`
- Auto-create framework if `frameworkId` is empty (same logic already exists in AICompetencyDialog)
- Library view uses standard Supabase query with `select('*, role_competencies(count)')` aggregation syntax: `select('id, name, description, order, is_active, role_competencies(count), competency_level_descriptions(count)')`

