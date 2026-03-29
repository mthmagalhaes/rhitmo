

## Plan: Generate Downloadable Technical Plan Document

### Summary
Create an exhaustive Markdown document covering the complete Rhitmo technical architecture, and output it as a downloadable file at `/mnt/documents/`.

### Content Outline
The document will consolidate everything from the codebase into a single comprehensive reference:

1. **Product Vision** — Service-as-Software, AI-Native Leadership Partner
2. **Architecture Diagram** — Frontend SPA + Lovable Cloud (Auth, Postgres RLS, Edge Functions, Storage)
3. **Database Schema (24 tables)** — Every table with columns and relationships, derived from `types.ts`
4. **Database Functions (20+)** — All RPC functions with args/returns
5. **Edge Functions (34)** — Categorized: AI, Audio, Notifications, Billing, Admin
6. **Pages & Routes (21)** — Public, Leader, HR Admin, Super Admin, Direct Report
7. **Components (~80+)** — Full inventory from src/components/
8. **Hooks (9)** — All custom hooks with descriptions
9. **Monetization** — 3 plans (Pulse/Pro/Business), pricing, limits, Stripe IDs
10. **Billing Infrastructure** — Edge functions, webhook flow, subscriptions table, BETA_MODE flag
11. **Integrations** — Stripe, Resend, Google Calendar, Lovable AI
12. **Security Model** — RLS policies, effective_user_id(), Zero Trust, user_roles
13. **Review Sharing System** — Tri-state flow (Draft → Sent → Confirmed), email notifications
14. **Recent Changes Log** — All features implemented in recent sprints
15. **Migration History** — 73 migrations listed

### Output
- File: `/mnt/documents/rhitmo-plano-tecnico-completo.md`
- Format: Markdown with tables and ASCII diagrams

### Approach
- Use all data already gathered from types.ts, components, hooks, pages, edge functions, billing page, and config
- Single script execution to write the file

