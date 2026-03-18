

## Plan: Update Recording Limits

Update recording hour limits from 4h→12h (Pro) and 8h→30h (Business) across three files. Also update Terms of Service from 20h→12h and 40h→30h to stay consistent.

### Files to Change

**1. `src/pages/Landing.tsx`** (line 82, 95)
- Line 82: `"Gravação de reuniões (até 4h/mês)"` → `"Gravação de reuniões (até 12h/mês)"`
- Line 95: `"Gravação de reuniões (até 8h/mês)"` → `"Gravação de reuniões (até 30h/mês)"`

**2. `src/pages/Billing.tsx`** (line 62, 76)
- Line 62: `'Gravação de reuniões (até 4h/mês)'` → `'Gravação de reuniões (até 12h/mês)'`
- Line 76: `'Gravação de reuniões (até 8h/mês)'` → `'Gravação de reuniões (até 30h/mês)'`

**3. `src/pages/TermsOfService.tsx`** (line 54, 64)
- Line 54: `(até 20h/mês)` → `(até 12h/mês)`
- Line 64: `(até 40h/mês)` → `(até 30h/mês)`

All other features, design, and formatting remain unchanged. Pulse stays locked.

