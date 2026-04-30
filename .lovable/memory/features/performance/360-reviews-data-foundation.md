---
name: 360° reviews data foundation (Sprint 10.1)
description: performance_reviews now supports review_type (manager/self/peer/upwards) + author_user_id; new review_peers table for invited peer reviewers
type: feature
---

Closes the 4 angles of performance in the Context Graph. Backwards-compatible: all existing reviews implicitly become `review_type='manager'`.

## Schema changes
- `performance_reviews.review_type text NOT NULL DEFAULT 'manager'` with CHECK in `('manager','self','peer','upwards')`.
- `performance_reviews.author_user_id uuid` (nullable; required for self/upwards via INSERT policy).
- New table `review_peers(id, review_id FK CASCADE, peer_user_id, status, response_jsonb, invited_at, completed_at)` with UNIQUE(review_id, peer_user_id).
- Indexes: `(member_id, review_type)`, `author_user_id`, peer table indexes by review/peer/status.

## RLS additions (no removals)
- **performance_reviews**: linked member can SELECT/INSERT/UPDATE rows where `author_user_id = auth.uid() AND review_type IN ('self','upwards')`. Member also sees `peer/upwards` reviews about themselves when `shared_with_member=true`.
- **review_peers**: peer sees/edits own row; leader/owner/HR see all rows of their members; only leader/owner can INSERT/DELETE.

## Triggers
1. `performance_reviews_restrict_self_upwards_update` — blocks member from changing `member_id`, `review_type`, `author_user_id`, or calibration fields (`classification`, `loss_risk`, `merit_recommendation`, `promotion_recommendation`) on their own self/upwards review.
2. `review_peers_restrict_peer_update` — peer can only mutate `response_jsonb`, `status`, `completed_at`; status restricted to `pending|completed|declined`; cannot revert `completed`. Auto-sets `completed_at`.
3. `review_peers_validate_workspace` — BEFORE INSERT ensures `peer_user_id` belongs to the same workspace as the reviewed member (as linked member, leader, owner, or HR admin).
4. `ctx_evidence_from_review` updated: emits evidence for `manager` (when shared, legacy behavior), `self` (always, visibility=private_leader unless shared), `peer/upwards` (only when shared). Tags include `review_type` for `/contexto` filtering.

## Backwards compatibility
- Default `'manager'` covers all legacy rows; existing edge functions, hooks, components untouched.
- `author_user_id` nullable — manager reviews continue to leave it null.
- Frontend UI for 360° comes in Sprint 10.2.
