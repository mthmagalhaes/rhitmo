## Objetivo

Simplificar `/lider/avaliacoes` para **2 abas**: Mensal (acompanhamento contínuo) e Formal (avaliação flexível com seletor de período). Trimestral some da UI — passa a ser um insumo interno alimentado por cron, consumido pelo gerador da Formal.

## O que muda na UI

### `src/pages/lider/Avaliacoes.tsx`

- `SubTab` passa de `'monthly' | 'quarterly' | 'formal'` para `'monthly' | 'formal'`.
- `TabsList` vira `grid-cols-2 max-w-sm`. Labels: **"Acompanhamento Mensal"** (ícone `Music`) e **"Histórico Formal"** (ícone `Sparkles`).
- Remove `<TabsContent value="quarterly">` e o import/uso de `QuarterlyRecapSection`.
- Subtítulo do header sem-seleção: trocar "gerar avaliações Mensal, Trimestral ou Formal" → "gerar Acompanhamento Mensal e Avaliações Formais".

### `src/components/recaps/RhitmoTimelineCard.tsx`

- Para de contar/mostrar `quarterly`. `useQuarterlyRecaps` sai. Linha de histórico vira só "X mensa(is) confirmado(s)".
- `onJumpToRhitmo` continua indo pra aba `monthly`.

### `src/pages/MemberDetails.tsx` (aba Rhitmo do perfil do membro)

- Remove sub-tabs Trimestral/Mensal: passa a renderizar só `MonthlyRecapSection`. `RhitmoTabSummary` mantém, mas `onSwitchSection` perde a opção `'quarterly'` (default `'monthly'`).
- `activeRhitmoSub` e o switch dele saem; jumpToRhitmoTimeline simplificado.

### `src/components/PerformanceReviewList.tsx` — densidade do Histórico Formal

- Hoje agrupa por status com `<Card>` por avaliação. Manter agrupamento (draft/shared/acknowledged) mas trocar cada item por **linha densa**: ícone + Título · `period_label` · data criação · status badge à direita · botão `Eye`/abrir. Sem `Card` em volta de cada review.
- `period_label` = se `period_start` e `period_end` definidos, exibir `MMM/yy – MMM/yy` (ex: "jan/26 – mar/26"); senão fallback para `period_type`.

### `src/components/review/CreateFormalReviewDialog.tsx` — seletor já existe, polir

- Já tem 3 botões grandes (`Último mês` / `Último trimestre` / `Personalizado`). Manter, sem mudança estrutural.
- Confirmar que `get_review_evidence(_member_id, _period_start, _period_end)` é o RPC que busca evidências do intervalo — já é. Ele continua retornando contagem de feedbacks + 1:1s daquele período. **Nenhum ajuste necessário.**  


# Comportamento no slack

Gostaria que quando o líder usasse frases ou prompts com linguagem natual solicitando o resumo mensal, o App Rhitmo pudesse fornecer Rhitmo mensal que já está pronto na web para o líder (caso ainda não esteja tudo bem).   
  
E para avaliações formais, prefiro que o líder acesse ainda pela plataforma web.  


## O que NÃO muda

- **Banco:** tabelas `monthly_recaps`, `quarterly_recaps`, `performance_reviews`, RPC `get_review_evidence` ficam intactas.
- **Edge functions / cron:** `generate-quarterly-recap`, `slack-echo-quarterly-confirmed`, Quarterly Anniversary Nudge (cron diário 12 UTC) continuam rodando. Eles geram os recaps trimestrais como **insumo interno** para o gerador da Formal e para o brief de 1:1 — só não tem mais aba dedicada.
- **Hooks `useQuarterlyRecaps`/`useGenerateQuarterlyRecap`:** ficam no codebase (usados internamente; não removo agora pra não quebrar imports residuais e não tornar a refatoração maior do que o usuário pediu).
- `QuarterlyRecapSection.tsx`: fica como dead component por hora (posso remover num passo seguinte se você quiser).
- Slack DM trimestral: continua sendo enviado (líder pode confirmar via NL/botão); só a página web não tem aba pra ver.

## Pontos abertos (defaults marcados)

1. **DM Slack do trimestral nudge** continua sendo enviada? *Default: sim, mantém — alimenta a Formal.* Se quiser silenciar também, é uma migration adicional desativando o cron.
2. **Histórico de quarterly_recaps já gerados** fica oculto? *Default: sim, oculto. Seguem no banco e podem ser exibidos depois se você mudar de ideia.*
3. **Texto da aba**: "Acompanhamento Mensal" e "Histórico Formal" — ou prefere algo mais curto tipo só "Mensal" e "Formal"? *Default: o nome longo, como você descreveu na briefing.*

## Checklist de execução

1. Editar `Avaliacoes.tsx` (tabs, imports, header).
2. Editar `RhitmoTimelineCard.tsx` (remover quarterly).
3. Editar `MemberDetails.tsx` (remover sub-tabs Rhitmo).
4. Refatorar `PerformanceReviewList.tsx` para layout denso por linha.
5. Smoke test visual em `/lider/avaliacoes` e `/member/:id`.