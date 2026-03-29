

## Plan: Add Goal Deadline & Mood Shift Nudges to Existing System

### Summary
The nudges system is already fully built — `generate-nudges` edge function, `leader_nudges` table, `NudgesBanner` on dashboard all work. Just need to add two new nudge generators (goal deadlines, mood shifts) to the existing edge function. No database changes, no UI changes, no new components needed.

### Changes

**1. Update `supabase/functions/generate-nudges/index.ts`**

Add two new async generator functions alongside `generateNoFeedbackNudges` and `generateNoPDINudges`:

**`generateGoalDeadlineNudges()`** — Queries `goals` table for active goals with `target_date` within the next 14 days. For each, creates a nudge with:
- `nudge_type: 'goal_deadline_7d'` (≤7 days) or `'goal_deadline_14d'`
- `severity: 'urgent'` (≤7 days) or `'warning'` (8-14 days)
- Message: `Meta "${title}" de ${name} vence em ${days} dias`
- `action_url: /member/${member_id}`

**`generateMoodShiftNudges()`** — Queries `feedbacks` table for each member, checking last 14 days of notes. If 3+ have sentiment in `('construtivo', 'critico')` (the negative sentiments used in Rhitmo), creates:
- `nudge_type: 'mood_shift'`
- `severity: 'urgent'`
- Message: `${name} teve ${count} sinais de atenção nas últimas 2 semanas`
- `action_url: /member/${member_id}`

Both use the same workspace/member join pattern as existing generators. Add them to the `Promise.all` call and include in the response breakdown.

### What stays the same
- `NudgesBanner.tsx` — already renders any nudge type generically (severity-based styling, action URL navigation, dismiss)
- `leader_nudges` table — `nudge_type` is a free text field, accepts new types without migration
- `saveNudges()` — deduplication logic works for any `nudge_type`
- Dashboard integration — already mounted
- `config.toml` — `generate-nudges` entry already exists

### Technical Notes
- Sentiment values in Rhitmo are: `muito_positivo`, `positivo`, `neutro`, `construtivo`, `critico` (not `negative`)
- Goal status values: `active`, `at_risk`, `completed`, `cancelled`
- The existing function already handles CORS and uses service role key

