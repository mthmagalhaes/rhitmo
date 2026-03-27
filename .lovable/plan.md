

## Plan: Share Review Dialog + Status Badges in FormalReviewSheet

### Summary
Replace the existing inline "Enviar ao Liderado" button with a proper confirmation dialog, add tri-state status badges (Rascunho/Enviada/Confirmada), and add an "Remover Compartilhamento" option.

### Changes

**1. New `src/components/review/ShareReviewDialog.tsx`**

AlertDialog with:
- Title: "Compartilhar Avaliação com Liderado"
- Description mentioning member name, explaining they'll receive email access
- Cancel + Confirm buttons
- Props: `open`, `onOpenChange`, `memberName`, `onConfirm`, `isPending`

**2. Update `src/components/review/FormalReviewSheet.tsx`**

- Add `Share2, CheckCircle2` to lucide imports
- Add state: `shareDialogOpen`
- Add `unshareMutation` (sets `shared_with_member: false`, `sent_at: null`)
- Replace the existing header badge block (lines 231-242) with tri-state badges:
  - `acknowledged_at` → green "Confirmada" badge with CheckCircle2
  - `shared_with_member && !acknowledged_at` → blue "Enviada" badge with Send
  - `!shared_with_member` → secondary "Rascunho" badge with FileText
- Replace footer "Enviar ao Liderado" button (lines 374-388) with:
  - If not shared: "Compartilhar com Liderado" button → opens ShareReviewDialog
  - If shared: "Remover Compartilhamento" outline button
- Render `ShareReviewDialog` before closing `</SheetContent>`
- Keep existing `sendMutation` logic but trigger it from dialog confirmation instead of direct button click

### No database changes needed
`shared_with_member`, `sent_at`, `acknowledged_at` columns already exist.

