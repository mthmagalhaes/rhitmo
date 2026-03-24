

## Plan: Fix RPC Evidence + Create generate-formal-review Edge Function

### Problem
1. RPC `get_review_evidence` returns 0 evidence — likely auth check uses `is_workspace_owner(auth.uid(), _member_id)` but should use `effective_user_id()` for consistency; also `feedbacks` table IS the "anotações" source (no separate `feedback_notes` table exists)
2. No edge function generates the formal review draft after creation — `generate-review` exists but isn't wired to the formal review flow
3. Evidence preview shows only 2 counters (Feedbacks + 1:1s) but should show 3 (Anotações + 1:1s + Feedbacks by type)

### Changes

**1. Database Migration — Fix RPC `get_review_evidence`**

Replace the function to:
- Use `effective_user_id()` instead of `auth.uid()` in the auth check (consistent with rest of codebase)
- Also check `is_hr_admin_of_workspace` for HR admin access
- Keep querying `feedbacks` table (that's where "anotações" live) and `meeting_transcripts`
- Fix `meeting_transcripts` column: use `duration_seconds` (not `duration`)
- Return 3 separate counters: `feedbacks_count`, `meetings_count`, `total_evidence_count` (keep existing return signature for backward compatibility)

**2. Create Edge Function `supabase/functions/generate-formal-review/index.ts`**

New function that:
- Accepts `{ reviewId }` in request body
- Fetches the review record from `performance_reviews` (with member info)
- Fetches ALL feedbacks + meeting_transcripts for the review period using service role (bypasses RLS)
- Builds context prompt with all evidence, anti-hallucination rules, and citation requirements
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) to generate HTML-formatted review
- Updates `performance_reviews.content` with generated HTML
- Returns success + content

Pattern: follow `generate-competencies` for auth (Bearer token + `getUser`), follow `generate-review` for prompt structure and AI call pattern. Output HTML (not Markdown) since FormalReviewSheet uses Tiptap/RichTextEditor.

**3. Update `src/components/review/CreateFormalReviewDialog.tsx`**

In `onSuccess` of `createMutation`:
- After creating review and calling `onReviewCreated`, invoke `generate-formal-review` edge function asynchronously
- On completion, invalidate `['formal-review', review.id]` query so FormalReviewSheet reloads with AI content
- On error, show toast "Erro ao gerar rascunho" but don't block (user can write manually)
- Update toast message to "Avaliação criada! Gerando com IA..."

**4. Update evidence preview in `CreateFormalReviewDialog.tsx`**

Change the 2-column grid (lines 194-209) to show 3 columns: Anotações, 1:1s, Feedbacks — mapping to `feedbacks_count`, `meetings_count`. Since the data source is all `feedbacks`, keep the existing field names but update labels.

**5. `supabase/config.toml`** — Add `generate-formal-review` function config with `verify_jwt = false` (auth in code).

### Technical Notes
- No `feedback_notes` table exists — "anotações" are `feedbacks` rows
- The existing `generate-review` function outputs Markdown; the new function outputs HTML for Tiptap compatibility
- Edge function uses service role to fetch evidence (bypasses RLS), but validates user auth via Bearer token
- CORS headers must include full Supabase client headers

