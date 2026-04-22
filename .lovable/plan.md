

# Execução: alinhar pricing aos limites reais da plataforma

Plano já aprovado. Vou executar as 5 mudanças exatamente como combinado, sem mexer em preços, caps reais ou lógica de beta user.

## Ordem de execução

### 1. `src/components/billing/UpgradeBanner.tsx` (PRIORITÁRIO — item 3)
Adicionar 2 checagens novas via `checkLimit`, **antes** das checagens existentes não atrapalharem:

- **Mentor Chat msgs**: `mentorMessageCount` vs `limits.maxMentorMessages` → label "Mensagens Mentor Chat"
  - Crítico no Pulse (cap = 20). Com 17/20 (= 85%), `checkLimit` retorna `'warning'` e o banner deve aparecer.
- **Horas de transcrição**: `recordingHoursUsed` vs `limits.maxRecordingHours` (só se `maxRecordingHours > 0` e ≠ Infinity) → label "Horas de transcrição"
  - Cobre Pro consumindo 25/30h.

Importar os campos extras já expostos por `useEnforcedLimits` (que estende `usePlanLimits`): `mentorMessageCount`, `recordingHoursUsed`. Format: `recordingHoursUsed.toFixed(1)` para não mostrar "24.7833333".

### 2. `src/pages/Landing.tsx`
- **PT (l.149-155)**: remover `"Upload manual de áudio"` de `pulseFeatures`.
- **PT (l.169)**: `"15 horas/mês de bot de transcrição (Recall.ai)"` → `"30 horas/mês de transcrição automatizada (Recall.ai + upload manual)"`.
- **EN (l.348-354)**: remover `"Manual audio upload"` de `pulseFeatures`.
- **EN equivalente do l.169**: trocar para `"30 hours/month of automated transcription (Recall.ai + manual upload)"`.
- Confirmar se há também bloco `es` no arquivo — se sim, mesma mudança.

### 3. `src/pages/Billing.tsx`
No objeto `PLAN_FEATURES` (l.50-81):
- **`pulse.features` (l.53-59)**: remover `'Upload manual de áudio'`.
- **`pro.features` (l.71)**: trocar para `'30 horas/mês de transcrição automatizada (Recall.ai + upload manual)'`.

### 4. `src/pages/TermsOfService.tsx`
- **l.54**: `"15 horas/mês de bot de transcrição (Recall.ai)"` → `"30 horas/mês de transcrição automatizada (Recall.ai + upload manual)"`.

### 5. i18n
Verificar se `src/i18n/locales/{pt-BR,en,es}.json` têm chaves espelhando essas strings. Strings da landing/billing/termos hoje vivem inline nos próprios `.tsx`, então provavelmente não há o que mudar nos JSON. Se houver, alinhar.

## Validação pós-execução

Confirmar os 4 critérios de aceite:

1. **Busca por "Upload manual de áudio"** em `src/pages/Landing.tsx` e `src/pages/Billing.tsx` retorna **0** ocorrências.
2. **Busca por "15 horas/mês"** em `src/` retorna **0** ocorrências; busca por "30 horas/mês" aparece em landing, billing, termos — todas batendo com `usePlanLimits` (`maxRecordingHours: 30`) e `MeetingRecorder.tsx` (toast cita 30h).
3. **Mentor Chat banner**: simular Pulse com `mentorMessageCount = 17`, `maxMentorMessages = 20` → `17/20 = 85%` ≥ 80% → `checkLimit` retorna `'warning'` → banner renderiza com chip "17/20 Mensagens Mentor Chat".
4. **Recording banner**: Pro com 25/30h → 83% → banner renderiza com chip "25.0/30 Horas de transcrição".

Após execução, retorno com:
- Confirmação dos 4 critérios.
- Lista exata de strings/linhas alteradas.
- Nada fora do escopo aprovado.

