

## Plan: Add Action Buttons to SkillsMapCard

### Summary
Add 3 action buttons below the "Foco Recomendado" section in `SkillsMapCard`: "Adicionar ao meu PDI", "Conversar com meu líder sobre isso", and "Pedir ajuda ao Meu Rhitmo". This transforms the card from informational to actionable.

### Changes

**1. `src/components/dashboard/SkillsMapCard.tsx`** — Add action buttons and callbacks

- Add 3 new optional callback props: `onAddToPDI`, `onSuggestOneOnOne`, `onOpenMeuRhitmo`
- After the "Foco Recomendado" section (line ~122), add a new action section with 3 buttons:
  - Primary: "Adicionar ao meu PDI" (Plus icon)
  - Outline: "Conversar com meu líder sobre isso" (MessageCircle icon)
  - Outline: "Pedir ajuda ao Meu Rhitmo" (Sparkles icon)
- Only render the action section when `suggested_focus` exists and at least one callback is provided
- Styling: `mt-6 pt-4 border-t border-border`, buttons `w-full justify-start`

**2. `src/components/dashboard/DirectReportDashboard.tsx`** — Wire up handlers

- Add `initialPrompt` state for MentorChat context
- **`handleAddFocusToPDI`**: Open `NewPDIDialog` (reuse existing `showPDIDialog` state) — the user already has the PDI creation flow, so just open it
- **`handleSuggestOneOnOne`**: Copy a pre-written 1:1 agenda suggestion to clipboard using `navigator.clipboard.writeText()`, show toast
- **`handleOpenMeuRhitmoWithContext`**: Set `initialPrompt` with the focus area context, then open `setMeuRhitmoOpen(true)`
- Pass these 3 handlers as props to `SkillsMapCard`

**3. `src/components/MentorChat.tsx`** — Accept `initialPrompt` prop

- Add optional `initialPrompt?: string` to `MentorChatProps`
- In a `useEffect`, when `open` becomes true and `initialPrompt` is set, populate the input field with the prompt text
- Clear initialPrompt after applying it

**4. Pass `initialPrompt` from DirectReportDashboard to MentorChat**

- Thread the new `initialPrompt` state through the existing `<MentorChat>` component

### Technical details

The first `suggested_focus` item is used as the focus area for action buttons. The 1:1 suggestion copies text like: "Gostaria de conversar sobre o desenvolvimento da minha competência em [X]. O Skills Map identificou isso como área prioritária."

No database changes needed — PDI creation reuses existing `NewPDIDialog`, clipboard API handles the 1:1 suggestion, and MentorChat just receives a pre-filled prompt.

