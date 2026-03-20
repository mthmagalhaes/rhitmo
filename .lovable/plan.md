

## Plan: Job-Based Competency Framework UX

### Summary
Redesign the `/hr/competency-framework` page to show a "Por Cargo" / "Por Competência" toggle view, add a 2-step dialog for creating job roles with competency associations, and support deleting job roles.

### Changes

**1. Update `src/pages/CompetencyFramework.tsx`**

- Add state: `viewMode` (`'roles' | 'competencies'`), `createJobRoleDialogOpen`, `editingJobRole`
- Add query for job roles using `get_job_roles_with_competencies` RPC (depends on `data?.frameworkId`)
- Add delete mutation for job roles (delete from `job_roles` table by id)
- Restructure layout:
  - Header: title + subtitle + "Adicionar Cargo" button (when in roles view) or existing "Adicionar Competencia" button (when in competencies view)
  - Toggle buttons: "Por Cargo" / "Por Competência" using `Button` variant toggle
  - **Roles view**: Map `jobRoles` into cards showing title, level badge, department, description, competency list with expected_level badges, edit/delete buttons. Empty state with Briefcase icon and CTA.
  - **Competencies view**: Keep existing DndContext + CompetencyCard + CompetencyPreviewTable code unchanged
- Render `CreateJobRoleDialog` at bottom

**2. Create `src/components/competency/CreateJobRoleDialog.tsx`**

Two-step dialog:
- **Step 1 (details)**: Title (required), Level (select from Junior-Principal), Department (input), Description (textarea). "Proximo: Competencias" button.
- **Step 2 (competencies)**: Fetch available competencies from `competencies` table filtered by `frameworkId`. Each shown with checkbox + name + description. When selected, show expected_level select (Junior/Pleno/Senior/Especialista). Summary of selected competencies as badges. "Salvar Cargo" button.
- On save: insert into `job_roles`, then batch insert into `role_competencies`. Invalidate `job-roles` query key.
- Reset form on close. Support `editingRole` prop for future edit functionality.

**3. No database changes needed**
Schema (`job_roles`, `role_competencies`) and RPC (`get_job_roles_with_competencies`) already exist from the previous migration.

### Technical Notes
- Import `supabase` from `@/integrations/supabase/client` (not `@/lib/supabase`)
- Use `toast` from `@/hooks/use-toast` for consistency with existing page
- Job role cards: use `Card`/`CardContent` components with badges for level and "Obrigatoria" flag
- Delete: confirm via `AlertDialog` before deleting

