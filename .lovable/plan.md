

## Plan: Add matheus_hr@rhitmo.co as HR Admin

### Findings

1. **User exists**: `matheus_hr@rhitmo.co` (ID: `e708e033-...`) — email confirmed, password set. The invite flow worked; the user was created successfully.

2. **Workspace "Trabalho" does not exist**. The previous UPDATE that was supposed to add both matheus@rhitmo.co and matheus_hr@rhitmo.co as HR Admins **matched zero rows** because no workspace has that name. Available workspaces:
   - FAP
   - Faster Ops
   - Gabriel - Central do Cliente
   - Growth Squad Inc
   - **Rhitmo Inc. 🙂** ← most likely your workspace

3. **No HR Admins exist on any workspace** — all `hr_admin_ids` arrays are empty.

### Action Required

Which workspace should `matheus_hr@rhitmo.co` be added to as HR Admin? Once confirmed, I will:

1. Run an UPDATE to add the user ID (`e708e033-7428-4bde-8b03-6c178dc059e4`) to that workspace's `hr_admin_ids` array
2. Optionally also add `matheus@rhitmo.co` (`032f8a17-...`) if desired

### Validation

After the update:
- Open incognito window → login as `matheus_hr@rhitmo.co`
- Navigate to `/hr/competency-framework`
- The `HRAdminGuard` will find the workspace via `.contains('hr_admin_ids', [userId])` and grant access

