# Melhoria: Tornar a navegação da tab Rhitmo mais óbvia

O fluxo está funcional mas a hierarquia visual não orienta. Você esperava ver março imediatamente e não viu porque o card de fevereiro (rascunho aguardando) ocupa o viewport inicial. E o trimestral fica "escondido" abaixo de 6 cards mensais.

## O que muda

### 1. Sumário no topo da tab Rhitmo

Acima do `MonthlyRecapSection`, adicionar um **strip de resumo** mostrando:

- "3 mensais no histórico (1 rascunho aguardando)"
- "0 trimestrais — Q1 2026 pronto para gerar" + botão âncora "Ir para trimestral ↓"
- "Abril — mês em andamento. Fechamento dia 2/mai" 

Isso responde "o que tem aqui?" sem precisar rolar.

### 2. Reordenar: trimestral antes do mensal

Inverter a ordem na tab. Trimestral é o ritual de **calibração** (mais raro, mais importante para Performance Review). Mensal é fonte. Hoje mostramos fonte primeiro, calibração depois — fica enterrado.

Nova ordem:

1. **Strip de sumário** (acima)
2. **Rhitmo Trimestral** (1 card focal Q1 2026 + anteriores)
3. Separador sutil
4. **Rhitmo Mensal** (6 cards — fonte de evidência)

### 3. Card do mês em curso (abril)

Em vez de simplesmente omitir abril, mostrar um card desabilitado:

> "**Abril 2026 — em curso.** Fechamento automático em 02/05. Você terá ~3 min para revisar e confirmar."

Tira a dúvida "cadê abril?".

### 4. Destaque do rascunho pendente

Quando há mensal em status `draft` aguardando confirmação, o card ganha borda âmbar mais marcada + chip "Aguardando você há X dias" no topo da seção. Hoje o badge é discreto.

## Detalhes técnicos

- **Arquivos editados:**
  - `src/pages/MemberDetails.tsx` — inverter ordem dentro de `<TabsContent value="rhitmo">` (Quarterly antes de Monthly) + adicionar `<RhitmoTabSummary memberId={...} />` no topo
  - `src/components/recaps/MonthlyRecapSection.tsx` — `buildLast6Months()` passa a incluir o mês corrente como card "in_progress" (nova prop `currentMonth`)
- **Arquivo novo:**
  - `src/components/recaps/RhitmoTabSummary.tsx` — strip de resumo com âncoras (smooth scroll para `#rhitmo-quarterly` / `#rhitmo-monthly`)
- **i18n:** novas chaves em `rhitmo.summary.*` e `rhitmo.recap.monthly.inProgress` para PT/EN/ES
- **Sem migration, sem edge function nova.** Tudo frontend.

## Critérios de aceite

- Ao abrir a tab Rhitmo, vejo o strip de sumário com contadores reais
- Trimestral aparece antes do mensal
- Card de "Abril 2026 — em curso" visível e desabilitado
- Rascunho pendente tem destaque âmbar mais forte
- Strings novas em PT/EN/ES