

## Plan: Competency Framework Admin UI for HR Admin

### Overview
Create a new page at `/hr/competency-framework` (nested under the HR area, not `/admin` which is for super_admins) where HR Admins can view, edit, reorder, and deactivate competencies.

### Dependencies
- Install `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop reordering

### New Files

**1. `src/pages/CompetencyFramework.tsx`**
Main page component wrapped in `HRAdminGuard`. Uses `useHRAdmin()` for workspace context. Fetches framework + competencies + level descriptions via Supabase queries. Contains:
- Same header pattern as HRDashboard (logo, workspace name, back button)
- Title: "Framework de Competências" with description
- "Adicionar Competência" button (top-right)
- Sortable list of CompetencyCard components (via @dnd-kit)
- Collapsible preview table at bottom
- On drag end: updates `order` column for affected competencies

**2. `src/components/competency/CompetencyCard.tsx`**
Card for each competency showing:
- Drag handle (GripVertical icon)
- Name + description + "4 níveis definidos" badge
- Edit button (opens modal) + Deactivate button (AlertDialog confirmation)
- Left border purple when active, muted when inactive
- Rounded-3xl, shadow-lg consistent with HRDashboard cards

**3. `src/components/competency/EditCompetencyModal.tsx`**
Dialog with react-hook-form:
- Name (required), Description (optional, max 200)
- Accordion with 4 levels (Júnior, Pleno, Sênior, Especialista)
- Each level: description textarea (required) + up to 3 example inputs (add/remove)
- Save creates/updates competency + level_descriptions in a single flow
- For new competencies: inserts competency then 4 level_descriptions

**4. `src/components/competency/CompetencyPreviewTable.tsx`**
Collapsible section with a table:
- Columns: Competência | Júnior | Pleno | Sênior | Especialista
- Cells show truncated descriptions with tooltip for full text
- Uses Collapsible from shadcn

### Modified Files

**5. `src/App.tsx`**
Add route: `/hr/competency-framework` wrapped in `HRAdminGuard`

**6. `src/pages/HRDashboard.tsx`**
Add navigation link/button to "Framework de Competências" pointing to `/hr/competency-framework`

### Data Flow
- Fetch: `competency_frameworks` WHERE workspace_id → get framework_id → fetch `competencies` with `competency_level_descriptions`
- Reorder: on drag end, batch update `order` column for moved items
- Deactivate: UPDATE `competencies` SET `is_active = false`
- Create/Edit: INSERT/UPDATE `competencies` + UPSERT `competency_level_descriptions`

### Design
- Background: `bg-[#F5F0E8]` (matching HRDashboard)
- Cards: `rounded-3xl shadow-sm bg-white/80 p-6`
- Purple accent: `border-l-4 border-violet-500`
- Dark mode support via existing theme classes

