

## Melhorias no card "Meu Rhitmo Sync" — Contexto por preferência + Nudge de atualização

### Arquivo alterado
`src/components/dashboard/DirectReportDashboard.tsx`

### Melhoria 1 — Linha de contexto por preferência

Substituir o layout atual de badges em `flex-wrap` (linhas 389-410) por uma lista vertical onde cada preferência tem:
- O badge existente (com cores já implementadas)
- Uma linha abaixo: `text-xs text-muted-foreground italic`

Adicionar 4 mapas de contexto como constantes no topo do arquivo:

```typescript
const chronotypeContext: Record<string, string> = {
  'early_bird': 'Seu líder sabe que você rende melhor de manhã cedo...',
  'madrugador': 'Seu líder sabe que você rende melhor de manhã cedo...',
  'commercial': 'Seu líder sabe que você está no seu melhor dentro do horário comercial.',
  'comercial': 'Seu líder sabe que você está no seu melhor dentro do horário comercial.',
  'night_owl': 'Seu líder sabe que sua energia peak é no período noturno.',
  'noturno': 'Seu líder sabe que sua energia peak é no período noturno.',
};
// + feedbackContext, recognitionContext (com todas as keys listadas no prompt)
// + fallbacks para valores não mapeados
```

O layout dos badges muda de `flex-wrap` horizontal para `space-y-3` vertical:

```tsx
<div className="space-y-3">
  {linkedMember.chronotype && (
    <div>
      <Badge ...>Madrugador</Badge>
      <p className="text-xs text-muted-foreground italic mt-1">
        {chronotypeContext[linkedMember.chronotype] || chronotypeContextFallback}
      </p>
    </div>
  )}
  {/* idem para feedback_style, recognition_style */}
  {motivators.length > 0 && (
    <div>
      <div className="flex flex-wrap gap-2">{/* badges amarelos */}</div>
      <p className="text-xs text-muted-foreground italic mt-1">
        Seu líder usa isso para conectar desafios e oportunidades ao que realmente te move.
      </p>
    </div>
  )}
</div>
```

### Melhoria 2 — Data de preenchimento + nudge

Adicionar helper `getDaysSince` no componente:
```typescript
const getDaysSince = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
```

Calcular dias usando `(linkedMember.work_style_data as any)?.completed_at` ou `linkedMember.updated_at` — o campo que existir.

Inserir entre o subtítulo "Seu perfil comportamental..." (linha 386) e os badges (linha 388):

- Se `days !== null && days <= 180`: texto cinza "Atualizado há X dias"
- Se `days > 180`: card amber com nudge + botão "Atualizar agora" que abre o dialog
- Se `days === null`: não renderizar nada

### Campos adicionados ao LinkedMemberData interface

Adicionar `updated_at?: string` na interface `LinkedMemberData` (linha 17-35) para poder usar como fallback de data.

### O que NÃO muda
- Dialog de edição (syncDialog) — intocado
- Tabs, CareerCompassCard, FeedbackTimeline
- Nenhum outro arquivo

