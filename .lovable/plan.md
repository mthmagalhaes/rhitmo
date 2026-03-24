

## Plan: Formal Review Creation Flow

### Analysis

The project already has a `performance_reviews` table and `PerformanceReviewList` component in MemberDetails. Creating a separate `formal_reviews` table would duplicate this. Instead, I'll enhance the existing `performance_reviews` flow with:
1. A new dialog for configuring period + previewing evidence
2. An RPC to gather evidence from `feedbacks` and `meeting_transcripts`
3. A button on MemberDetails page (where the member context already exists)

Key corrections from user's SQL:
- **No `feedback_notes` table exists** — evidence sources are `feedbacks` and `meeting_transcripts` only
- **`meeting_transcripts` has no `title` or `summary` columns** — use `leader_notes` and `LEFT(transcript, 200)` instead
- **Use existing `performance_reviews` table** instead of creating `formal_reviews` (avoid duplication). Add missing columns via migration if needed.

However, looking more carefully, the existing `performance_reviews` table already has `period_start`, `period_end`, `content`, `coaching_tip`, `shared_with_member`, `period_type`. It's missing: `competency_evaluations JSONB`, `evidence_count INTEGER`, `status` (it has no status field). I'll add these columns to the existing table rather than creating a new table.

### Changes

**1. Database Migration — Add columns to `performance_reviews` + Create RPC**

Add to `performance_reviews`:
```sql
ALTER TABLE public.performance_reviews 
  ADD COLUMN IF NOT EXISTS competency_evaluations JSONB,
  ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS job_role_id UUID REFERENCES public.job_roles(id);
```

Create RPC `get_review_evidence(_member_id UUID, _period_start DATE, _period_end DATE)` that returns:
- `feedbacks_count`, `meetings_count`, `total_evidence_count`
- `feedbacks JSONB` (id, date, content preview, sentiment, tags)
- `meetings JSONB` (id, date, leader_notes preview, duration)

Uses `is_workspace_owner(auth.uid(), _member_id)` for auth check. No `feedback_notes` reference.

**2. New component `src/components/review/CreateFormalReviewDialog.tsx`**

Dialog with:
- Header: member name + role
- Period selection: 3 toggle buttons (Último mês, Último trimestre, Personalizado)
- Custom period: 2 date pickers
- Evidence preview card: 2-column grid (Feedbacks count, 1:1s count) + total
- 2 checkboxes: "Rascunho Geral" (AI text), "Avaliação de Competências"
- "Criar Avaliação" button — inserts into `performance_reviews` with `period_type: 'formal'`
- On success: navigates to member details or opens review view

**3. Update `src/pages/MemberDetails.tsx`**

- Add "Avaliação Formal" button next to "Nova Anotação" in the action bar (lines 401-414)
- Add state + render `CreateFormalReviewDialog`
- Pass member data and workspace info

### Technical Notes
- Evidence RPC is SECURITY DEFINER with `is_workspace_owner` check
- `feedbacks` content is included in evidence (leader already has access via RLS)
- `meeting_transcripts` uses `leader_notes` field (no `title`/`summary` columns)
- Reuses `performance_reviews` table with `period_type: 'formal'` to distinguish from existing manual reviews
- No new table needed — extends existing infrastructure

