---
name: Master-Detail Pages
description: /lider/1on1s, /lider/diario, /lider/objetivos e /lider/avaliacoes usam MemberMasterList sticky 260px bg-muted/30 com avatar sm; root das páginas tem h-[calc(100svh-3rem)] overflow-hidden + main com overflow-y-auto (scroll independente, app-feel); conteúdo interno max-w-3xl px-6 lg:px-8 py-6 sem mx-auto
type: design
---

# Master-Detail (Sprint 12.1 + 12.2 + 12.4 + 12.5)

## Regras gerais de layout (estilo Windmill/Linear/Notion — full-bleed app)

1. **Container raiz da página**: `flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden`. Trava a altura à viewport e impede scroll do body — sensação de SaaS app, não de website.
2. **Aside esquerdo** (`MemberMasterList`): largura fixa `w-[260px]` (era 280), sticky `top-0 self-start h-[calc(100svh-3rem)]`, `border-r border-border/40`, **`bg-muted/30`** (contraste claro vs. main `bg-background`). `overflow-hidden` no container interno; ScrollArea interno cuida do scroll da lista.
3. **Densidade da lista**: avatar `size="sm"` (h-8 w-8), linhas `px-2.5 py-1.5 gap-2.5`, nome `text-[13px] leading-tight`, cargo `text-[11px] leading-tight mt-0.5`. Header da lista `px-3 pt-4 pb-2` com eyebrow `text-[10px]`. Filtro de times trigger `h-7 text-[11px]`. Ganho: cabe ~50% mais gente no fold sem rolar.
4. **Coluna direita** (`<main>`): `flex-1 min-w-0 overflow-y-auto bg-background`. Scroll vertical é dela — a sidebar fica ancorada.
5. **Header da master list é SEMPRE genérico**: "Liderados · N pessoas". Nunca o nome da página (1:1s, Diário, Objetivos). A prop `title` foi mantida apenas por compat e é ignorada.
6. **Filtro de times**: `Select` compacto dentro da master list. NÃO usar `TeamTabs` aqui — ele tem `Plus Novo Time` e wrap que vazam.
7. **Footer "Novo liderado"**: estilo item de menu (`text-xs`, `text-muted-foreground hover:text-foreground`), sem ser CTA destacado.
8. **Conteúdo do main**: `max-w-3xl px-6 lg:px-8 py-6 space-y-6` (sem `mx-auto`, alinhado à esquerda — o gutter direito vira respiro natural). O **título da página vive aqui**, mesmo no estado vazio (h1 grande + subtítulo).
9. **Quando há liderado selecionado**: o nome da página vira eyebrow pequeno (`text-[11px] uppercase tracking-[0.18em]`) e o `<h1>` passa a ser o nome do liderado.
10. **EmptyMemberDetail**: ícone outline (`strokeWidth=1.5`, `text-muted-foreground/40`), sem card colorido atrás. Tipografia compacta (`text-lg` título, `text-xs` descrição).
11. **Diário**: privacidade é status inline (`Lock` h-3 + texto pequeno) + banner discreto, nunca um Card que ocupa espaço.

## /lider/1on1s especificamente (Sprint 12.2)

Ordem fixa das seções na coluna direita, **empilhadas full-width** (sem grid 2-col, para respiro Notion-like):

1. Eyebrow `1:1S` + header (avatar + nome do liderado + botão "Abrir ficha")
2. **`OneOnOnePrepCard`** — sugestões da Rhitmo via `get_team_timeline` (já existia)
3. **`MemberUpcomingMeetings`** — versão enxuta filtrada por `memberId`. NÃO é o `UpcomingMeetingsCard` da Home (esse tem toggle de auto-transcribe, badge de plano, "Desconectar" — pesado demais aqui). O componente novo só mostra até 3 reuniões com badge de tempo + link Meet + brief.
4. **`AgendaBlock variant="shared"`** — Pauta compartilhada. **Card neutro** (`bg-card`, `border-border`), ícone `Eye` muted. O peso visual NÃO está aqui.
5. **`ActionItemsBlock`** — Checklist append-only. Cada save insere uma nova row em `feedbacks` com `tags: ['action-items-1on1']`, `visibility: 'shared'`, content em markdown `- [ ] item` / `- [x] item`. Não edita registros antigos (mantém o happy-path de AgendaBlock).
6. **`AgendaBlock variant="private"`** — Anotação privada. **`bg-muted/50` + `border-dashed border-border/60` + cadeado proeminente** (`text-foreground`). Contraste inverso vs. Shared para reforçar que é o espaço seguro do líder.
7. CTA `Histórico de 1:1s e notas` → `/member/{id}?tab=diary`

### Por que Shared neutra e Private com peso

A primeira iteração tinha Shared verde e Private igual ao card (`bg-card`). Inversão: o usuário precisa **ver com clareza** quando está num espaço privado (cadeado + fundo distinto + dashed). A pauta compartilhada é o "default" do trabalho colaborativo, então fica neutra.

### Onde o `UpcomingMeetingsCard` (pesado) ainda vive

Apenas em `/lider/inicio` (Home V3 Windmill) — lá faz sentido ter toggle de auto-transcribe e badge de plano porque é a visão consolidada do dia. Não reusar em master-detail.

## /lider/diario especificamente (Sprint 12.3)

Ordem fixa na coluna direita quando há liderado selecionado:

1. Eyebrow `DIÁRIO DE BORDO` + header (avatar + nome + cargo). **Sem botão "Nova nota"** — captura é inline.
2. **Banner de privacidade fixo**: `rounded-xl bg-muted/60 border border-border/60 px-3.5 py-2.5`, ícone `Lock` h-3.5 + "**Diário privado.** Estas anotações são 100% confidenciais e visíveis apenas para você." Sempre presente, sem dismissable.
3. **`QuickPrivateNoteInput`** — Captura rápida sempre visível: Card `rounded-2xl bg-card`, header `PenSquare + "Captura rápida"`, Textarea `min-h-[100px]` com placeholder `Anotação privada sobre {primeiroNome}…`, botão "Salvar nota" + atalho ⌘/Ctrl+Enter. INSERT em `feedbacks` com `visibility: 'private_leader'`, `tags: ['diario-bordo']`, `title: 'Anotação do diário'`. Sem modal `NewNoteDialog`.
4. **`FeedbackFilters`** (só se `feedbacks.length > 0`)
5. **`FeedbackTimeline`** (cronológico desc) ou empty state textual: "Você ainda não tem anotações privadas para {nome}. Que tal registrar a primeira observação acima?"

### Anti-flicker ao trocar de liderado

`useQuery` usa `placeholderData: (prev) => prev` para manter as notas anteriores visíveis enquanto a próxima query carrega. A troca entre liderados na master list fica instantânea, sem piscar a tela inteira (padrão Notion/Linear).

### Por que NÃO reusar `NewNoteDialog`

`NewNoteDialog` continua existindo para `MemberDetails` (onde o líder cria nota com tags customizadas, ocorrência no passado, etc). No Diário, o atrito de abrir modal mata a captura rápida — leader precisa "sair digitando". O componente novo é deliberadamente minimalista (sem tags custom, sem time machine) para forçar fluidez.

## Por quê (geral)

A primeira iteração colocava o título da página dentro da master list, criando uma "faixa horizontal flutuante" que atravessava as duas colunas e quebrava o paralelo visual. O TeamTabs também vazava para fora dos 320px. O empty state tinha um quadrado lavanda atrás do ícone que parecia "invadir" a timeline. Tudo isso longe da limpeza Windmill/Linear que o produto persegue.

## /lider/avaliacoes especificamente (Sprint 12.6 — página terminal)

Página agora **resolve a tarefa inline**, sem redirect para `/member/:id`. Reutiliza os mesmos componentes do `MemberDetails` (`RhitmoTimelineCard`, `MonthlyRecapSection`, `QuarterlyRecapSection`, `PerformanceReviewList`, `CreateFormalReviewDialog`).

Ordem fixa na coluna direita quando há liderado selecionado:

1. Eyebrow `AVALIAÇÕES` + header (avatar + nome + cargo).
2. **Action Bar — "Gerar avaliação"**: grid `sm:grid-cols-3` com 3 `ActionCard` (`rounded-2xl`, hover-lift, ring quando ativo): Rhitmo Mensal (`Music`), Rhitmo Trimestral (`BarChart3`), Avaliação Formal (`Sparkles`). Mensal/Trimestral apenas trocam o sub-tab abaixo; Formal abre `CreateFormalReviewDialog` inline (não navega).
3. **`RhitmoTimelineCard`** com seus 3 estados (tem recaps / tem evidência pra primeiro / não tem nada). `feedbacksLastMonthCount` vem de `useQuery` com `count: 'exact', head: true` filtrado por `member_id` + `occurred_at` no mês passado.
4. **Sub-tabs `[Mensal] [Trimestral] [Formais]`**: render condicional de `MonthlyRecapSection`, `QuarterlyRecapSection`, `PerformanceReviewList`. Default = `monthly` (alimenta o trimestral). Trocar de liderado reseta para `monthly`.

`workspaceId` necessário para `CreateFormalReviewDialog` vem de `useLeaderMembers().workspace.id`. `member.role` vem de `LeaderMemberRow.role`.

### Por que NÃO redirecionar para /member/:id?action=new

A página antiga jogava o líder fora da master list (perdia a navegação rápida entre liderados) só para mostrar 2 cards explicativos. Padrão "service-as-software": a tarefa "gerar avaliação" tem que terminar onde começou. `MemberDetails` continua existindo intocado para quem chega por outras rotas (clique em nome em outras telas).

### Por que sub-tabs e não 3 seções empilhadas

`MonthlyRecapSection` sozinho já é uma timeline longa de cards (Maio, Abril, Março...). Empilhar Mensal + Trimestral + Formais quebraria a leitura num scroll infinito. Sub-tabs preservam foco; a Action Bar no topo é o atalho pra gerar sem trocar de aba.
