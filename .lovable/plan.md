

## Plan: Unify MentorChat and MeuRhitmo into a single component

### Summary

MentorChat.tsx (798 lines, leader) and MeuRhitmo.tsx (610 lines) share ~90% identical code (sidebar, threads, messages, markdown rendering, delete dialog). The key differences are:

| Aspect | MentorChat (leader) | MeuRhitmo (direct report) |
|--------|-------------------|--------------------------|
| Thread type filter | none (implicit 'mentor') | `.eq('type', 'career')` |
| Edge function | `chat-mentor` | `meu-rhitmo` |
| Query keys | `chat-threads`, `mentor-messages` | `meu-rhitmo-threads`, `meu-rhitmo-messages` |
| Header title | "Mentor Chat" + member name | "Meu Rhitmo" |
| Header badge | ContextPicker | "Confidencial" badge |
| Quick suggestions | 3 leader-focused | 5 career-focused |
| Features | File attachment, VoiceInput, ContextPicker, retry logic, loading steps | Simpler (no attachments, no voice, no context picker) |
| Empty state | "Mentor de {name}" | "Ola, {firstName}!" |
| Icon | 🎯 emoji | `<Sparkles>` icon |
| Props | memberName, memberId, feedbacks, workStyleData, etc. | memberName, memberRole, workStyleData, aiAnalysis, pdiItems, latestReview, userId |

### Approach

Create a unified `MentorChat` component with a `userType: 'leader' | 'direct_report'` prop that controls the behavioral differences.

### Files to modify

**1. `src/components/MentorChat.tsx`** - Refactor to accept both modes

- Add `userType` prop to `MentorChatProps`
- Make leader-only props optional: `feedbacks?`, `memberId?`, `keyObjectives?`, `leaderSyncData?`
- Add direct-report props as optional: `aiAnalysis?`, `pdiItems?`, `latestReview?`, `userId?`
- Derive config from `userType`:
  - `threadType`: `'mentor'` vs `'career'`
  - `queryKeyPrefix`: `'chat-threads'` vs `'meu-rhitmo-threads'`
  - `edgeFunctionName`: `'chat-mentor'` vs `'meu-rhitmo'`
  - `title`: `'Mentor Chat'` vs `'Meu Rhitmo'`
  - `quickSuggestions`: leader set vs career set
  - `icon`: emoji vs Sparkles
  - `placeholder`: leader vs career text
  - `emptyStateTitle`/`emptyStateDescription`
- Thread query: add `.eq('type', threadType)` filter (leader currently doesn't filter -- add `'mentor'` type)
- Thread creation: include `type: threadType` in insert
- Conditionally render ContextPicker (leader) vs Confidencial badge (direct report)
- Conditionally render file attachment + VoiceInput (leader only)
- Send logic: branch on `userType` to call the correct edge function with correct payload
- Keep retry/loading-steps logic for both (was leader-only, harmless for both)

**2. `src/components/MeuRhitmo.tsx`** - Delete entirely

**3. `src/components/dashboard/DirectReportDashboard.tsx`** - Update import
- Replace `import MeuRhitmo` with `import { MentorChat }`
- Update the JSX call to pass `userType="direct_report"` and map props accordingly

**4. `src/pages/MemberDetails.tsx`** - Add `userType="leader"` prop to existing `<MentorChat>` call (no other changes needed since existing props match)

### Edge functions

No changes needed. Both `chat-mentor` and `meu-rhitmo` edge functions remain as-is. The unified component calls the correct one based on `userType`.

### Risk mitigation

- Thread isolation preserved: queries always filter by `type` column
- No visual changes: identical CSS, just conditional rendering of badges/icons/text
- Backward compatible: existing leader usage only needs `userType="leader"` added

### Technical details

The unified props interface:

```typescript
interface MentorChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: 'leader' | 'direct_report';
  memberName: string;
  memberId?: string;        // leader mode
  memberRole?: string;
  feedbacks?: any[];         // leader mode
  workStyleData?: any;
  keyObjectives?: string | null;  // leader mode
  leaderSyncData?: any;          // leader mode
  aiAnalysis?: any;              // direct_report mode
  pdiItems?: any[];              // direct_report mode
  latestReview?: string | null;  // direct_report mode
  userId?: string;               // direct_report mode (for thread ownership)
}
```

The component internally resolves the effective user ID: in leader mode from `useAuth().user.id`, in direct_report mode from the `userId` prop.

