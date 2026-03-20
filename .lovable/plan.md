

## Plan: Job-Based Competency Framework Schema

### Summary
Add three new tables (`job_roles`, `role_competencies`, `competency_templates`) and one RPC to support a cargo-centric competency model. Existing flat competencies remain untouched for backward compatibility. This is schema-only (no UI changes).

### Changes

**1. Database Migration — New Tables + RPC + Seed Data**

Single migration with:

- **`job_roles`**: Stores job titles per framework with level and department. RLS allows workspace owners and HR admins to manage; linked members can view.
- **`role_competencies`**: Maps competencies to job roles with expected level, required flag, and weight. Same RLS pattern as `job_roles`.
- **`competency_templates`**: Public catalog of example frameworks (Spotify, Nubank). RLS: any authenticated user can read public templates.
- **RPC `get_job_roles_with_competencies`**: Returns job roles with aggregated competency data as JSONB. SECURITY DEFINER.
- **Seed data**: 2 template rows (Spotify Engineering, Nubank Values).

**Key corrections from user's SQL:**
- The `FOR ALL` policy needs a `WITH CHECK` expression — will add it matching the `USING` clause
- Use `effective_user_id()` instead of `auth.uid()` for consistency with the rest of the codebase (supports admin impersonation)
- CHECK constraint on `level` uses validation trigger instead (per guidelines) — actually, since these are static enum-like values that don't involve time, CHECK constraints are fine here
- Add `updated_at` trigger on `job_roles` using existing `update_updated_at_column()` function

**No frontend changes in this step.** The user stated "Próximo prompt: UX para criar cargos com competências."

### Technical Details

```text
job_roles
├── id (PK)
├── framework_id (FK → competency_frameworks)
├── title, level, department, description
└── timestamps

role_competencies
├── id (PK)
├── job_role_id (FK → job_roles)
├── competency_id (FK → competencies)
├── expected_level, is_required, weight
└── UNIQUE(job_role_id, competency_id)

competency_templates (read-only catalog)
├── id (PK)
├── name, company, job_title, level
├── competencies (JSONB)
└── is_public
```

