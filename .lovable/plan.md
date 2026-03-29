

## Plan: Fix "Nova Nota" Button & Expand Bias Detection Words

### Summary
Two fixes: (1) Add a "Nova Nota" button to the MemberDetails action bar, (2) expand the bias word lists to catch "nervosa", "histérica", "dramática", "ansiosa", "frágil", etc.

### Changes

**1. `src/pages/MemberDetails.tsx`** — Add "Nova Nota" button (line ~406)

Insert a button between "Início" breadcrumb and "Gravar Reunião":
```jsx
<Button onClick={() => setDialogOpen(true)} className="gap-2">
  <PenSquare className="h-4 w-4" />
  <span className="hidden sm:inline">Nova Nota</span>
</Button>
```

`PenSquare` is already imported. `dialogOpen` and `setDialogOpen` already exist and wire to `NewNoteDialog`. No new state or imports needed.

**2. `src/lib/biasDetection.ts`** — Expand word lists and alternatives

Add to `FEMININE_CODED_WORDS`:
- `'nervosa'`, `'histérica'`, `'dramática'`, `'ansiosa'`, `'frágil'`, `'delicada'`, `'emocional'`

Add to `MASCULINE_CODED_WORDS`:
- `'autoritário'`, `'arrogante'`, `'intimidador'`

Add corresponding entries to `NEUTRAL_ALTERNATIVES`:
- `'nervosa'` → `['reativa sob pressão', 'demonstrou tensão']`
- `'histérica'` → `['reagiu intensamente', 'demonstrou frustração']`
- `'dramática'` → `['expressiva', 'comunicação intensa']`
- `'ansiosa'` → `['demonstrou urgência', 'preocupada com prazos']`
- `'frágil'` → `['em desenvolvimento', 'precisa de suporte']`
- `'delicada'` → `['cuidadosa na abordagem', 'diplomática']`
- `'emocional'` → `['demonstrou envolvimento', 'engajada emocionalmente']`
- `'autoritário'` → `['estilo de liderança diretivo', 'comunicação firme']`
- `'arrogante'` → `['autoconfiante', 'seguro/a de si']`
- `'intimidador'` → `['presença forte', 'comunicação impositiva']`

### No other changes needed
- `NewNoteDialog` bias integration already works (debounce, `detectBiasWithPositions`, `BiasSuggestionsPanel`)
- `RichTextEditor` already has `BiasUnderlineExtension` and `biasMatches` prop
- CSS wavy underlines already in `index.css`

