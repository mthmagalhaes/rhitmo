---
name: Pulse Surveys data foundation (Sprint 9.1)
description: Conversational leader-triggered surveys (blockers/priorities/retro/goal_progress) with auto evidence integration to context_evidence
type: feature
---

`pulse_surveys` is the 4th pillar of the Context Graph — captures the member's perspective via N-question surveys with AI summary. Coexists with `member_prompts` (which is the lighter weekly 1-question Pulse Card).

## Schema
- `workspace_id`, `member_id` (FK team_members ON DELETE CASCADE), `requested_by` (leader user_id)
- `type`: 'blockers' | 'priorities' | 'retro' | 'goal_progress'
- `status`: 'pending' | 'completed' | 'expired'
- `questions` jsonb (leader/AI generated), `responses` jsonb (member fills), `summary` jsonb ({tldr, themes[], sentiment, action_items[]})
- `context_metadata` jsonb (e.g. goal_id ref), `sent_at`, `expires_at`, `completed_at`

## Triggers
1. **`pulse_surveys_validate_workspace`** (BEFORE INSERT/UPDATE workspace_id, member_id): rejects mismatch between `workspace_id` and `_ctx_resolve_workspace(member_id)`.
2. **`pulse_surveys_restrict_member_update`** (BEFORE UPDATE): if actor is the linked member (not leader), only `responses`/`status`/`completed_at` can change; status restricted to pending/completed.
3. **`ctx_evidence_from_pulse_survey`** (AFTER INSERT/UPDATE status, summary, responses, completed_at): on `status='completed'`, upserts a row into `context_evidence` with `source_table='pulse_surveys'`, `evidence_type='pulse_response'`, `visibility='shared'`. If status reverts away from completed, removes the evidence.

## RLS
- SELECT: leader, workspace owner, HR admin, linked member, super admin.
- INSERT: leader only (`requested_by = effective_user_id() AND is_team_leader(...)`).
- UPDATE: leader (full) or linked member (constrained by trigger).
- DELETE: leader or workspace owner.

## sourceMeta
`pulse_surveys` mapped to label "Pulse Survey", icon Sparkles, cyan badge — visible in `/lider/contexto` feed and citations.
