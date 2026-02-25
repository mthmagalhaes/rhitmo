

## Ajuste do Dialog Rhitmo Sync — Campos idênticos ao Wizard

### Arquivo alterado
`src/components/dashboard/DirectReportDashboard.tsx`

### Resumo das alterações

Substituir os 5 campos atuais do Dialog por 10 campos organizados em 3 seções, idênticos ao wizard `/sync/:memberId`. Adicionar multi-select de motivadores com chips. Atualizar badges para incluir motivadores amarelos.

---

### 1. Estado do formulário (linhas 78-84)

Substituir `syncForm` por:
```typescript
const [syncForm, setSyncForm] = useState({
  chronotype: '',
  work_environment: '',
  energy_drains: '',
  energy_sources: '',
  stress_signs: '',
  support_needed: '',
  feedback_style: '',
  recognition_style: '',
  motivators: [] as string[],
  skill_goal: '',
});
```

### 2. Pre-populate (linhas 87-97)

Atualizar o `useEffect` para popular os novos campos a partir de `linkedMember.work_style_data`:
```typescript
setSyncForm({
  chronotype: linkedMember.chronotype || '',
  work_environment: (wsd as any)?.work_environment || '',
  energy_drains: (wsd as any)?.energy_drains || '',
  energy_sources: (wsd as any)?.energy_sources || '',
  stress_signs: (wsd as any)?.stress_signs || '',
  support_needed: (wsd as any)?.support_needed || '',
  feedback_style: linkedMember.feedback_style || '',
  recognition_style: linkedMember.recognition_style || '',
  motivators: (wsd as any)?.motivators || [],
  skill_goal: (wsd as any)?.skill_goal || '',
});
```

### 3. Save handler (linhas 134-164)

Atualizar `handleSaveSync` para fazer merge dos novos campos em `work_style_data`:
```typescript
work_style_data: {
  ...existingWsd,
  work_environment: syncForm.work_environment || null,
  energy_drains: syncForm.energy_drains || null,
  energy_sources: syncForm.energy_sources || null,
  stress_signs: syncForm.stress_signs || null,
  support_needed: syncForm.support_needed || null,
  motivators: syncForm.motivators.length > 0 ? syncForm.motivators : null,
  skill_goal: syncForm.skill_goal || null,
}
```

### 4. Dialog body (linhas 417-488)

Substituir os 5 campos atuais por 10 campos em 3 seções:

**Seção "Ritmo e Energia"** — separador `<p>` uppercase tracking-wide
1. Cronotipo (Select): Madrugador / Horário Comercial / Noturno
2. Ambiente ideal (Select): Silencioso e focado / Dinâmico e colaborativo / Flexível / híbrido / Remoto
3. O que drena minha energia (Textarea, 200 chars)
4. O que carrega minha energia (Textarea, 200 chars)

**Seção "Manual de Instruções"**
5. Quando estou estressado (Textarea, 200 chars)
6. Em dias ruins, me ajude... (Textarea, 200 chars)
7. Feedback (Select): Direto / Empático / Escrito
8. Reconhecimento (Select): Público / Privado

**Seção "Futuro"**
9. Motivadores (multi-select chips, max 3): Autonomia | Dinheiro | Estabilidade | Aprendizado | Propósito | Status
   - Toggle: `bg-primary text-white` selecionado, `bg-muted text-muted-foreground` não selecionado
   - `rounded-full` chips
10. O que quer aprender (Textarea, 200 chars)

Dialog: `max-w-lg max-h-[80vh] overflow-y-auto`

### 5. Label maps (linhas 48-70)

Atualizar `chronotypeLabels` para as novas opções:
- `madrugador` → "Madrugador"
- `comercial` → "Horário Comercial"
- `noturno` → "Noturno"

Atualizar `feedbackStyleLabels`:
- `direto` → "Direto"
- `empatico` → "Empático"
- `escrito` → "Escrito"

Atualizar `recognitionStyleLabels`:
- `publico` → "Público"
- `privado` → "Privado"

Remover emojis dos labels dos badges (estilo leve).

### 6. Badges na tab Meu Perfil (linhas 368-385)

Adicionar badges amarelos para cada item do array `motivators` em `work_style_data`:
```tsx
{(linkedMember.work_style_data as any)?.motivators?.map((m: string) => (
  <Badge className="rounded-full bg-amber-50 text-amber-700 text-xs px-3 py-1">{m}</Badge>
))}
```

### O que NÃO muda
- Estrutura das tabs, CareerCompassCard, FeedbackTimeline
- Lógica de save (supabase update direto + invalidate query)
- DirectReportGuard, nenhum outro arquivo

