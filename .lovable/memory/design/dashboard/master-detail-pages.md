---
name: Master-Detail Pages
description: /lider/1on1s, /lider/diario, /lider/objetivos usam MemberMasterList sticky 280px; /lider/1on1s tem ordem editorial Sugestões→Próximas→Pauta→Action items→Privada; /lider/diario tem banner de privacidade fixo + QuickPrivateNoteInput inline (sem modal)
type: design
---

# Master-Detail (Sprint 12.1 + 12.2)

## Regras gerais de layout (estilo Windmill/Linear)

1. **Aside esquerdo** (`MemberMasterList`): largura fixa `w-[280px]` (era 320), sticky `top-0`, `border-r border-border/40`, `bg-card/30`. `overflow-hidden` no container interno para garantir que nada vaze.
2. **Header da master list é SEMPRE genérico**: "Liderados · N pessoas". Nunca o nome da página (1:1s, Diário, Objetivos). A prop `title` foi mantida apenas por compat e é ignorada.
3. **Filtro de times**: `Select` compacto (h-8) dentro da master list. NÃO usar `TeamTabs` aqui — ele tem `Plus Novo Time` e wrap que vazam para fora dos 280px.
4. **Footer "Novo liderado"**: estilo item de menu (`text-xs`, `text-muted-foreground hover:text-foreground`), sem ser CTA destacado.
5. **Coluna direita** (`<main>`): sempre tem `max-w-2xl mx-auto px-6 lg:px-10 py-10 space-y-8`. O **título da página vive aqui**, mesmo no estado vazio (h1 grande + subtítulo).
6. **Quando há liderado selecionado**: o nome da página vira um eyebrow pequeno (`text-[11px] uppercase tracking-[0.18em]`) e o `<h1>` passa a ser o nome do liderado.
7. **EmptyMemberDetail**: ícone outline (`strokeWidth=1.5`, `text-muted-foreground/40`), sem card colorido atrás. Tipografia compacta (`text-lg` título, `text-xs` descrição).
8. **Diário**: privacidade é status inline (`Lock` h-3 + texto pequeno), nunca um banner Card que ocupa espaço.

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
