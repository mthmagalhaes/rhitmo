# Polish da seção de pricing — Landing

Ajustes pontuais em `src/pages/Landing.tsx` para melhorar hierarquia visual e percepção de valor. **Nenhuma mudança em preços, planos, lógica de billing, Stripe IDs, CTAs ou toggles.**

---

## Mudança 1 — Pulse: reordenar features

Em `pulseFeatures` (PT linha 149-155 e EN linha 352-358), mover "Até 2 liderados diretos" / "Up to 2 direct reports" para o **último** item.

Nova ordem:
1. Diário de bordo ilimitado
2. Mentor AI — até 20 conversas por mês
3. 1 avaliação com IA por mês
4. Notas e registros ilimitados
5. Até 2 liderados diretos

(Mesma reordenação aplicada na versão EN.)

---

## Mudança 2 — Pro: dois grupos visuais de features

Reestruturar `proFeatures` (PT linha 161-172 e EN linha 363-374) de uma lista plana para uma estrutura agrupada. Vou usar uma forma compatível com o render existente: trocar o array de itens por um array de **grupos**, cada grupo com `label` e `items`.

Exemplo de shape (PT):
```ts
proFeatures: [
  {
    groupLabel: "Ciclo de Performance",
    items: [
      { label: "Diário de bordo + resumo mensal automático", isNew: true },
      { label: "Acompanhamento trimestral guiado por IA", isNew: true },
      { label: "Avaliações formais com evidências citadas" },
    ],
  },
  {
    groupLabel: "Ferramentas de Apoio",
    items: [
      { label: "Transcrição automática de reuniões — 30h/mês" },
      { label: "Pre-meeting briefs com contexto histórico" },
      { label: "Detecção de viés em tempo real" },
      { label: "Mentor AI ilimitado" },
      { label: "Time acessa feedbacks e metas em tempo real" },
      { label: "Analytics completo · Times ilimitados" },
      { label: "Liderados ilimitados" },
    ],
  },
]
```

EN espelhado com labels traduzidas ("Performance Cycle" / "Support Tools").

**Notas de copy importantes:**
- "Liderados ilimitados" sai da posição 1 e vai para o **fim do grupo 2** (conforme briefing).
- "Avaliações formais ilimitadas com evidências citadas" passa a ser "Avaliações formais com evidências citadas" (briefing remove "ilimitadas").
- Badges "Novo" preservados exatamente onde estão hoje.

**Render** (linhas 712-726): substituir o `.map` único por um `.map` de grupos que renderiza:
- Subtítulo do grupo: `<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">`
- Lista de itens com o mesmo markup atual (Check + label + badge Novo).
- A partir do segundo grupo, adicionar `border-t border-border/40 pt-4 mt-4` no wrapper para criar o divider sutil entre grupos.

---

## Mudança 3 — Pro: destacar equivalência mensal

Linha 698-700 (bloco "Equivale a R$ X/mês"):

De:
```tsx
<p className="text-xs text-muted-foreground mt-1.5">
  {t.equivPerMonthLabel} <span className="font-semibold text-foreground">R$ {pricing.perMonth}</span>{t.perMonthShort}
</p>
```

Para:
```tsx
<p className="text-sm font-medium text-muted-foreground mt-1.5">
  {t.equivPerMonthLabel} <span className="font-semibold text-foreground">R$ {pricing.perMonth}</span>{t.perMonthShort}
</p>
```

Isso já cobre os ciclos trimestral/semestral/anual porque `pricing.perMonth` é dinâmico via toggle. Posição mantida.

---

## Mudança 4 — Enterprise: frase de impacto

Adicionar duas chaves novas em ambos os blocos `t`:
- PT: `enterpriseImpact: "Ciclo completo de performance para toda a organização — calibração entre gestores, blindagem jurídica e visibilidade do RH em tempo real."`
- EN: `enterpriseImpact: "Complete performance cycle for the entire organization — cross-manager calibration, legal protection, and real-time HR visibility."`

No card Enterprise (entre `enterpriseSubtitle` na linha 740 e o bloco de preço na linha 742), inserir:
```tsx
<p className="text-sm italic text-muted-foreground mt-3">{t.enterpriseImpact}</p>
```

A frase aparece **abaixo** do subtítulo "Para a organização inteira: HR Dashboard..." e **antes** do "Sob consulta", como pedido.

---

## Validação final
- Pulse: "Até 2 liderados diretos" como último item ✓
- Pro: dois grupos com labels uppercase + divider sutil ✓
- Pro: "Equivale a R$X/mês" em `text-sm font-medium` ✓
- Enterprise: frase em itálico antes de "Sob consulta" ✓
- Badges "Novo" preservados ✓
- Preços, toggles, CTAs, Stripe, lógica de billing: intocados ✓
- Sem novos arquivos ou componentes — tudo inline em `src/pages/Landing.tsx` ✓
- Paridade PT/EN mantida ✓
