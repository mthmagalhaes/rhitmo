## Contexto

O screenshot do preview confirma: **as edições v3 propostas em turnos anteriores nunca foram aplicadas**. A Landing ainda está no estado pré-v3:

- Hero CTA secundário diz "See plans" / "Ver planos" (não bate com header que já mostra "Pricing" / "Preços")
- Overlines das seções continuam roxos (`text-xs font-semibold tracking-widest text-primary`)
- H2 das seções continuam pequenos (`text-3xl lg:text-4xl`)
- Seção "Demonstração" (iframe YouTube `bRQiwrBGlsc`) ainda presente
- Seção "Para quem é Rhitmo" (Persona Cards) ainda presente

## O que vou fazer

### Bloco 1 — Aplicar v3 na Landing (`src/pages/Landing.tsx`)

1. **Renomear CTA:** `seePlans` "Ver planos" → "Preços" (PT, linha 58) e "See plans" → "Pricing" (EN, linha 278).
2. **Remover 2 seções:**
   - "Demonstração" / vídeo YouTube (linhas 1109–1135)
   - "Para quem é Rhitmo" / Persona Cards (linhas 1342–1400)
3. **Restilizar 7 cabeçalhos de seção** no padrão editorial v3:
   - Overline: `text-[10px] uppercase tracking-[0.45em] text-muted-foreground` + hairline `h-px w-8 bg-primary/20`
   - H2: `font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]`
   - Lead: `text-lg lg:text-xl text-muted-foreground/80 leading-relaxed`
   - Margens: `mb-6 / mb-8 / mb-16`
   - Seções afetadas: `beforeAfter`, `comparison`, `numbers`, `forLeaders`, `forReports`, `forHR`, `faq`
4. **Bento de Números:** tirar overlines coloridos (`text-primary` / `text-destructive`) dos 3 cards → `text-muted-foreground`. Mantém border-l colorida como único acento.

### Bloco 2 — Auditoria visual cross-page (sem editar)

Antes de finalizar, navego pelo preview e capturo screenshots desktop (1366) e mobile (375) das páginas públicas adjacentes que dividem visual com a Landing, para checar se há inconsistência herdada do padrão antigo:

- `/` (Landing — desktop + mobile, light + dark)
- `/auth` (AuthPage)
- `/enterprise`

Devolvo no fim uma lista curta de inconsistências encontradas (hardcoded colors, overlines roxos, H2 fora do padrão v3). **Não aplico nada além da Landing nesse turno** — qualquer ajuste em Auth/Enterprise vira plano separado, conforme sua escolha de "redesign de páginas fora do padrão".

### Bloco 3 — Validação

- Screenshot da Landing pós-edits em desktop e mobile, light e dark mode.
- Confirmo que CTA do hero, overlines, H2 e remoção de seções aparecem como esperado.

## Fora de escopo

- Reescrita de copy
- Mudança de paleta / tokens em `index.css` / `tailwind.config.ts`
- Hero, Pricing, Footer (já estão no padrão atual)
- Páginas logadas (líder, liderado, HR, admin)
- Onboarding, Invite, Privacy, Terms

## Detalhes técnicos

Padrão v3 do cabeçalho de seção (componente inline, não extraído):

```tsx
<div className="text-center mb-16 max-w-3xl mx-auto">
  <div className="inline-flex items-center gap-3 mb-6">
    <span className="h-px w-8 bg-primary/20" />
    <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
      {t.numbersOverline}
    </p>
    <span className="h-px w-8 bg-primary/20" />
  </div>
  <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-foreground mb-8">
    {t.numbersTitle}
  </h2>
  <p className="text-lg lg:text-xl text-muted-foreground/80 leading-relaxed">
    {lead}
  </p>
</div>
```

Nas seções "Para Líderes / Liderados / RH" o overline atual é um pill colorido (Zap/Heart/BarChart) — mantenho o pill (já é parte da identidade visual dessas 3 seções) mas subo o H2 para `text-4xl lg:text-5xl xl:text-6xl` para alinhar escala com as demais.
