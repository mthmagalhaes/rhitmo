

## Plan: Competency Framework Data Model

### Migration SQL

One migration creating 3 tables, 1 function, 1 trigger, and RLS policies.

**Tables:**

1. `competency_frameworks` — one per workspace (unique constraint on workspace_id), FK to workspaces with cascade delete
2. `competencies` — FK to competency_frameworks with cascade delete, unique order per framework
3. `competency_level_descriptions` — FK to competencies with cascade delete, unique (competency_id, seniority_level)

**RLS Policies:**

For all 3 tables:
- **SELECT**: workspace owner (`effective_user_id() = w.owner_id`) OR HR admin (`is_hr_admin_of_workspace(w.id)`) OR linked member in workspace
- **INSERT/UPDATE/DELETE**: workspace owner OR HR admin only

The join path varies by table:
- `competency_frameworks`: direct `workspace_id`
- `competencies`: via `framework_id → competency_frameworks.workspace_id`
- `competency_level_descriptions`: via `competency_id → competencies.framework_id → competency_frameworks.workspace_id`

**Function:** `create_default_competency_framework(p_workspace_id uuid)` — SECURITY DEFINER, inserts framework + 6 competencies + 24 level descriptions with the exact content provided.

**Trigger:** `AFTER INSERT ON workspaces` → calls `create_default_competency_framework(NEW.id)`.

### No Frontend Changes

This is a data-model-only task. No UI components or code files need modification.

### Technical Details

```text
workspaces (existing)
└── competency_frameworks (1:1 via workspace_id UNIQUE)
    └── competencies (1:N via framework_id)
        └── competency_level_descriptions (1:4 via competency_id)
            constraint: UNIQUE(competency_id, seniority_level)
```

The seniority levels are stored as text values: `'junior'`, `'pleno'`, `'senior'`, `'especialista'`.

