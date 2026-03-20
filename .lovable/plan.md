

## Plan: Remove Feedback/PDI Content from HR Admin View (Privacy Fix)

### Problem
HR Admin can see full feedback content and PDI details in the Member Profile Sheet. This violates leader-member confidentiality. HR should only see metadata (counts, dates).

### Changes

**1. Database: Update RPC `get_hr_member_profile`**

Drop and recreate with new return signature — remove `pdi_items JSONB` and `recent_feedbacks JSONB`, replace with `pdi_count INTEGER` and `has_pdi BOOLEAN`. All other columns stay the same.

**2. Frontend: `src/components/hr/MemberProfileSheet.tsx`**

- Remove unused imports: `Badge`, `sentimentColors`, `statusLabels`
- Remove `pdiItems` and `recentFeedbacks` variable extraction
- Replace 4-tab layout with: metadata cards (Feedbacks count + PDI count) above a 2-tab layout (Sync, Skills)
- Metadata cards: 2-column grid showing feedback_count with last_feedback_date, and pdi_count with has_pdi flag
- Tabs default to "sync" instead of "feedbacks"
- Remove Feedbacks TabsContent and PDI TabsContent entirely

### No other files affected
`HRMembers.tsx` doesn't reference feedback content. The RPC signature change is backward-compatible since only this component calls it.

