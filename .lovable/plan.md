
# Repensar a UX de /lider/avaliacoes

Dois problemas relatados no fechamento do Q2:

1. **Hierarquia invertida** — hoje o Acompanhamento Mensal ocupa o palco (Insight de cobertura no topo, coluna "Últ. Mensal" antes de "Últ. Formal", tab "Mensal" como default). No fechamento de ciclo, quem manda é a **Avaliação Formal**; o Mensal é insumo.
2. **Sheet lateral ruim** — o `<Sheet side="right" w-full sm:max-w-3xl>` cobre metade da tela, força scroll interno, tapa a lista, e não parece nativo. A régua nova já existe no projeto: `mem://design/dashboard/master-detail-pages` (1:1s, Diário, Objetivos) usa lista à esquerda 260px + detalhe cheio à direita, tudo no shell.

## O que muda

### 1. Layout master-detail nativo (fim do sheet)
Trocar `Sheet` por layout inspirado em `/lider/1on1s`, `/lider/diario`, `/lider/objetivos`:

```text
┌───────────────────────────── /lider/avaliacoes ─────────────────────────────┐
│ Header compacto  |  chips "Sem Formal 6m+" / "Sem Mensal" / "Em dia"        │
├────────────────────┬────────────────────────────────────────────────────────┤
│ MemberMasterList   │ Detalhe do liderado selecionado                        │
│ 260px bg-muted/30  │ max-w-3xl, px-6 lg:px-8 py-6, scroll próprio           │
│ - avatar sm        │ ─────────────────────────────────────────────────────  │
│ - nome + role      │ [Hero Formal] Próximo ciclo · CTA "Nova Avaliação"     │
│ - chip estado      │ [Timeline Formal] card grande com últimas avaliações   │
│ - "Sem Formal 6m"  │ [Rhitmo desta pessoa] recap compacto (colapsado)       │
│                    │ [Acompanhamento Mensal] accordion abaixo               │
└────────────────────┴────────────────────────────────────────────────────────┘
```

- `h-[calc(100svh-3rem)] overflow-hidden` no root, `overflow-y-auto` no detalhe (padrão da memória).
- Rota com param opcional: `/lider/avaliacoes/:memberId?` — deep-link, back nativo, sem modal.
- Empty state à direita quando nenhum liderado selecionado: reaproveita o `ReviewsCoverageInsight` + tabela cross-member atual (visão geral do time).

### 2. Formal em primeiro plano
Dentro do detalhe do liderado:

- **Hero "Rhitmo Formal"** — card grande no topo, editorial (Lora, `rounded-3xl`, shadow suave), com:
  - Última avaliação (título, período, status, data)
  - CTA primário **"Novo Rhitmo Formal"** (violeta, já existente)
  - Métrica lateral: "X evidências prontas · Y meses desde a última"
- **Lista Formal expandida por padrão** (sem tabs Mensal/Formal competindo).
- **Bloco "Rhitmo Mensal" vira contexto colapsado** logo abaixo, com badge "5 confirmados · alimenta a próxima Formal" e botão "Expandir". Sem tabs — accordion.
- Card "Rhitmo desta pessoa" (contador de mensais) encolhe para uma linha discreta no header do bloco Mensal.

### 3. Tabela cross-member (visão geral)
Quando nenhum liderado está selecionado (ou em telas largas, opcionalmente empilhada acima do detalhe em `xl:`):

- Reordenar colunas: **Liderado · Time · Últ. Formal · Próxima Formal (sugerida) · Cadência (chip Rhitmo) · Últ. Mensal · Ação**.
- Coluna "Próxima Formal": sugere trimestre baseado em `lastFormalAt` (ex.: "Q3/2026 devido").
- Chip default: `no_formal_6m` em vez de `needs_monthly`.
- `ReviewsCoverageInsight` atual (foco em Mensal) rebatizado como bloco secundário "Cobertura de Acompanhamento Mensal", abaixo da tabela — não é mais o herói.

### 4. Herói do topo
Novo `FormalReviewCoverageHero` acima da tabela: "N de M liderados sem Formal nos últimos 6 meses · [Chips com avatares] · CTA bulk 'Preparar próxima rodada'".

## O que NÃO muda
- Motor de dados: `useTeamReviewsSummary`, `useLeaderMembers`, `PerformanceReviewList`, `MonthlyRecapSection`, `RhitmoTimelineCard`, `CreateFormalReviewDialog` — todos reaproveitados.
- Edge functions, RLS, migrations: nada.
- Diário, Mentor Chat, Home — intocados.
- Portal do liderado (`/liderado/avaliacoes`) — fora do escopo desta iteração.

## Arquivos a mudar
- `src/pages/lider/Avaliacoes.tsx` — reescrever para layout master-detail com rota `/:memberId?`.
- `src/App.tsx` — adicionar rota param.
- **Novos:**
  - `src/components/leader/avaliacoes/ReviewsMasterList.tsx` (baseado em `MemberMasterList` de 1:1s).
  - `src/components/leader/avaliacoes/ReviewsMemberDetail.tsx` (conteúdo hoje no sheet, redesenhado com Formal primeiro).
  - `src/components/leader/avaliacoes/FormalReviewHero.tsx` (card editorial do topo).
  - `src/components/leader/avaliacoes/FormalReviewCoverageHero.tsx` (visão geral do time).
- **Deprecar/remover uso de:** `ReviewsMemberSheet.tsx` (mantém arquivo com JSDoc `@deprecated` para segurança, remove import).
- `ReviewsCrossMemberTable.tsx` — reordenar colunas, mudar default do chip, ajustar cabeçalho.
- `ReviewsCoverageInsight.tsx` — visual mais discreto (deixa de ser hero).

## Fora do escopo (podemos abrir depois)
- Redesenhar o wizard `CreateFormalReviewDialog` em si (só a entrada muda).
- Comparativo entre Formais (Q1 vs Q2).
- Notificações/lembretes de próxima Formal.

Confirma esse rumo antes de eu construir?
