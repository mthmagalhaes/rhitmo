

## Plan: Bias Detection v1 for Review Creation

### Summary

Add real-time, client-side gender bias detection to `NewReviewDialog.tsx`. The system detects gendered word patterns as the leader edits review content, shows an educational inline alert with neutral alternatives, and optionally logs detections for HR analytics.

Note: The project already has AI-powered bias detection for **feedbacks** (via `analyze-feedback` edge function + `BiasDetectionPanel`). This new feature adds **client-side, word-list-based** detection specifically for the **review creation** flow, providing instant feedback without waiting for AI.

### Files to create/modify

**1. Create `src/lib/biasDetection.ts`**
- Feminine-coded word list (organizada, cuidadosa, colaborativa, etc.)
- Masculine-coded word list (assertivo, decisivo, estratégico, etc.)
- Neutral alternatives map
- `detectGenderBias(text)` function returning `{ hasBias, biasType, detectedWords, suggestions, explanation }`
- Threshold: 2+ words from the same gender category triggers alert
- Strip HTML tags before analysis (since RichTextEditor produces HTML)

**2. Create `src/components/BiasAlert.tsx`**
- Educational, non-blocking alert card
- Design: `bg-blue-50` with `border-l-4 border-blue-500`, Lightbulb icon
- Shows detected words, neutral alternatives, and explanation
- Two actions: "Entendi, ignorar" (ghost button) and optional "Ver sugestões no MentorChat"
- Collapsible details section for suggestions list

**3. Modify `src/components/NewReviewDialog.tsx`**
- Import `detectGenderBias` and `BiasAlert`
- Add state: `biasResult`, `showBiasAlert`, `biasDismissCount`
- Add debounced effect (2s) on `content` changes to run detection (only when content > 50 words)
- Render `BiasAlert` between the RichTextEditor and the footer
- Fatigue prevention: stop alerting after 3 dismissals in the same session
- Non-blocking: alert does not prevent saving

**4. Database migration (optional analytics table)**
- Create `bias_detections` table with columns: `id`, `leader_id` (uuid, not FK to auth.users), `member_id` (uuid), `bias_type` (text), `detected_words` (text[]), `dismissed` (boolean), `context` (text: 'review' or 'feedback'), `created_at`
- RLS: leaders can INSERT own rows; HR Admins can SELECT via `is_hr_admin_of_workspace` function
- Indexes on `leader_id` and `bias_type`

### Technical details

- HTML stripping: use a simple regex (`/<[^>]*>/g`) to get plain text from the rich editor before word matching
- Debounce: 2000ms `setTimeout` in a `useEffect` with cleanup
- Word matching: case-insensitive, uses `includes()` on lowercased plain text
- The BiasAlert renders between the content editor and DialogFooter, visually inline with the editing flow
- No changes to existing `BiasDetectionPanel` (that's for feedback timeline, separate feature)

### What this does NOT include (Sprint 7)
- Recency bias / Halo effect detection
- MentorChat integration (the "Ver sugestões" button is a placeholder for now)
- Aggregated HR dashboard for bias patterns

