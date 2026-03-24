

## Plan: Formal Review Sheet with Draft + Competency Tabs

### Changes

**1. New component `src/components/review/FormalReviewSheet.tsx`**

Sheet (right side, `sm:max-w-3xl` ~800px) with:
- **Header**: Title "Avaliação Formal", member name/role, period dates, "Enviada" badge if `shared_with_member`
- **2 Tabs**: "Rascunho Geral" (large Textarea, 20 rows) and "Competências" (competency cards with RadioGroup + Textarea per competency)
- **Footer**: "Fechar" left, "Salvar Rascunho" + "Enviar ao Liderado" right
- **Data flow**: Fetches review from `performance_reviews` by ID. Fetches competencies via `get_job_roles_with_competencies` if `job_role_id` exists. Initializes local state from DB, saves back on button click.
- **Competency ratings**: 4 radio options (Abaixo do Esperado / Atende / Supera / Excelência), stored as JSONB in `competency_evaluations`
- **Send**: Sets `shared_with_member = true`, closes sheet

Note: The query joins `performance_reviews` with member info. Since `performance_reviews` doesn't have a FK to `job_roles` that's populated yet (the `job_role_id` column exists but team_members don't have one), competencies tab will show empty state initially — which is correct behavior.

**2. Update `src/components/review/CreateFormalReviewDialog.tsx`**

- Add `onReviewCreated?: (reviewId: string) => void` prop
- In `onSuccess`, call `onReviewCreated?.(review.id)` to trigger sheet opening

**3. Update `src/pages/MemberDetails.tsx`**

- Add state: `reviewSheetOpen`, `selectedReviewId`
- Pass `onReviewCreated` callback to `CreateFormalReviewDialog` that sets review ID and opens sheet
- Render `FormalReviewSheet` with review ID

### No database changes needed
`competency_evaluations` JSONB column and `shared_with_member` boolean already exist on `performance_reviews`.

