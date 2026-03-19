

## Plan: Remove PDI Button from SkillsMapCard and Update Copy

### Summary
Remove the "Adicionar ao meu PDI" button from SkillsMapCard, add a hint box pointing users to the PDI section, and update the PDI button copy to "Propor Ação de Desenvolvimento".

### Changes

**1. `src/components/dashboard/SkillsMapCard.tsx`**
- Remove `onAddToPDI` prop from interface and component params
- Remove the `Plus` import (no longer needed)
- Update `hasActions` to check only `onSuggestOneOnOne || onOpenMeuRhitmo`
- Remove the "Adicionar ao meu PDI" button block (lines 135-144)
- After the two remaining buttons, add a blue hint box: "💡 Próximo passo: Adicione esta competência ao seu PDI usando o botão 'Propor Ação de Desenvolvimento' abaixo."

**2. `src/components/dashboard/DirectReportDashboard.tsx`**
- Remove `handleAddFocusToPDI` handler (lines 406-408)
- Remove `onAddToPDI={handleAddFocusToPDI}` from `SkillsMapCard` props (line 574)
- Update the PDI button (line 600-603): change copy to "Propor Ação de Desenvolvimento", add `size="lg"` and `className="gap-2 w-full"`

**3. `src/components/NewPDIDialog.tsx`**
- Update dialog title from "Propor meu PDI" to "Propor Ação de Desenvolvimento" (line 107)

