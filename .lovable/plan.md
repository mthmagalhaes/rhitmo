

## Plan: AI-Powered Competency Framework Generation

### Problem
Creating competencies manually takes 2-4 hours. AI can generate a complete framework in 30 seconds from a job title, letting HR just review and edit.

### Changes

**1. Edge Function `supabase/functions/generate-competencies/index.ts`**

- Uses Lovable AI Gateway (not OpenAI directly) — LOVABLE_API_KEY is already configured
- Accepts `{ job_title, level?, industry? }` 
- Uses tool calling for structured output (not `response_format: json_object`)
- Returns array of competencies, each with: `name`, `description`, and `levels` array (4 levels: junior/pleno/senior/especialista with description + examples)
- Matches existing data model so results can be saved directly to `competencies` + `competency_level_descriptions`
- CORS headers included, `verify_jwt = false` with manual auth via `getUser()`
- Handles 429/402 errors from AI gateway

**2. New component `src/components/competency/AICompetencyDialog.tsx`**

Mode selection dialog with two options:
- **Gerar com IA** — input job title (with datalist autocomplete), optional level/industry, calls edge function, shows editable preview of generated competencies
- **Criar manualmente** — opens existing `EditCompetencyModal`

AI flow:
1. User enters job title → clicks "Gerar"
2. Loading state (Sparkles icon + spinner)
3. Preview: editable cards for each competency (name, description, 4 levels with descriptions + examples)
4. User can edit/remove individual competencies
5. "Salvar Tudo" batch-inserts into `competencies` + `competency_level_descriptions` using existing `frameworkId`

**3. `src/pages/CompetencyFramework.tsx`** — Wire up

- Replace the "+ Adicionar Competência" button to open `AICompetencyDialog` instead of directly opening `EditCompetencyModal`
- Pass `frameworkId` and current max `order` to the dialog
- On save, invalidate `competency-framework` query

**4. `supabase/config.toml`** — Add function config

```toml
[functions.generate-competencies]
verify_jwt = false
```

### Key design decisions
- Uses Lovable AI Gateway with `google/gemini-3-flash-preview` (fast, no extra API key needed) instead of OpenAI
- AI generates all 4 seniority levels per competency (matching existing data model) — not just behaviors
- Batch save: inserts all competencies at once with proper `order` sequencing
- Manual mode falls through to existing `EditCompetencyModal` (no duplication)

### No database changes needed
Existing tables (`competencies`, `competency_level_descriptions`) already support all needed fields.

