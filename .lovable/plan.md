

## Plan: Improve Health Legend Clarity

### Problem
The legend says "Até 7 dias", "8 a 14 dias" etc. without context — the user doesn't know what those days refer to at first glance.

### Changes

**File: `src/pages/Index.tsx` (lines 501-509)**

Update the subtitle and legend to make the meaning self-evident:

- **Subtitle**: Change from `"X liderados · Clique em um card para ver o histórico"` to `"X liderados · Clique em um card para ver o histórico"`
- **Legend intro**: Add a small label before the dots: `"Última anotação:"` so the legend reads naturally
- **Legend items**: Slightly rephrase for scannability:
  - 🟢 `"Recente (até 7 dias)"`
  - 🟡 `"Atenção (8–14 dias)"`
  - 🔴 `"Sem registro (+14 dias)"`
  - ⚪ `"Nenhuma nota"`

This way the section reads: **Última anotação:** 🟢 Recente (até 7 dias) 🟡 Atenção (8–14 dias) ...

### File Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Update legend labels (lines 504-509) |

