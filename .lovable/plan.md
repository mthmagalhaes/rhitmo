# Plano — /lider/avaliacoes vira a "central de avaliações" do liderado

## Avaliação do pedido

Concordo com a direção. O fluxo atual tem fricção dupla:

1. Usuário escolhe o liderado na master list → vê só dois cards explicativos.
2. Clica em "Mensal", "Trimestral" ou "Formal" → é jogado para `/member/:id?tab=rhitmo` (ou `tab=reviews`), perde o contexto da master list e a navegação entre liderados.

A página deveria ser **terminal** (resolve a tarefa ali mesmo), igual `/lider/diario` resolve a captura de notas inline.

**Sobre nomenclatura**: você mencionou "Rhitmo Formal", mas hoje no produto existem **Rhitmo Mensal**, **Rhitmo Trimestral** e **Avaliação Formal** (Performance Review é uma entidade diferente do Rhitmo, com Tiptap, sharing lifecycle, etc.). Vou manter os 3 nomes distintos — agrupar tudo como "Rhitmo" confundiria a memória do produto. Se quiser renomear "Avaliação Formal" → "Rhitmo Formal" depois, é uma decisão separada de copy.

## O que muda na coluna direita quando há liderado selecionado

Ordem fixa, tudo full-width empilhado (padrão master-detail Windmill):

```text
┌─────────────────────────────────────────────────────┐
│ AVALIAÇÕES (eyebrow)                                │
│ [avatar] Gabriela Lucas                             │
│         Analista de Business Ops                    │
├─────────────────────────────────────────────────────┤
│ Action Bar — Gerar avaliação                        │
│  [♪ Rhitmo Mensal]  [▦ Rhitmo Trimestral]          │
│  [✦ Nova Avaliação Formal]                         │
├─────────────────────────────────────────────────────┤
│ RhitmoTimelineCard (estado A/B/C, já existe)       │
├─────────────────────────────────────────────────────┤
│ Sub-tabs: [Mensal] [Trimestral] [Formais]          │
│                                                     │
│  Mensal      → <MonthlyRecapSection memberId/>     │
│  Trimestral  → <QuarterlyRecapSection memberId/>   │
│  Formais     → <PerformanceReviewList ... />       │
└─────────────────────────────────────────────────────┘
```

**Por que sub-tabs e não 3 seções empilhadas?** O Mensal sozinho já é uma timeline longa de cards (Maio, Abril, Março...). Empilhar Mensal + Trimestral + Formais quebra a leitura — fica scroll infinito. Sub-tabs preservam o foco no que o líder quer ver agora, mantêm o padrão que `MemberDetails` já usa, e a Action Bar no topo é o "atalho" pra gerar sem precisar trocar de aba.

## Action Bar — comportamento

3 botões na barra de ação:

- **Rhitmo Mensal** — abre o sub-tab "Mensal" e rola pro topo. O `MonthlyRecapSection` já tem CTA interno de gerar quando há evidência suficiente; reutilizamos. Se o mês corrente já tem rascunho, o clique foca nele.
- **Rhitmo Trimestral** — mesma lógica, sub-tab "Trimestral".
- **Nova Avaliação Formal** — abre o `CreateFormalReviewDialog` inline (já existe, é o mesmo que `?action=new` aciona em `MemberDetails`). Não navega, não troca de página.

Visual: cards `rounded-2xl` lado a lado num grid `sm:grid-cols-3`, ícones (Music, BarChart3, Sparkles), copy curtinha.

## Anti-flicker e estado

- `useState` do liderado selecionado já existe.
- Sub-tab default = `monthly` (mais usado, alimenta o trimestral).
- `RhitmoTimelineCard` já tem 3 estados (tem recaps / tem evidência pra primeiro / não tem nada) — usar como hoje em `MemberDetails`.
- `PerformanceReviewList` precisa do `memberName` — pegar do `selected.name`.

## O que sai da página

- ❌ Os dois cards "Escolha o tipo de avaliação" / "Rhitmo" / "Avaliação Formal" como navegação (viram Action Bar).
- ❌ Os sub-botões "Mensal / Trimestral" dentro do card Rhitmo (substituídos pela Action Bar + sub-tabs).
- ❌ Toda navegação para `/member/:id?tab=rhitmo` ou `?tab=reviews` a partir desta página.

## O que continua igual

- `MemberMasterList` na esquerda, mesma estrutura, mesmo `EmptyMemberDetail` quando ninguém selecionado.
- Container raiz `flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden`.
- Conteúdo `max-w-3xl px-6 lg:px-8 py-6 space-y-6`.
- `MemberDetails` continua existindo intocado — quem chega lá por outras rotas (clique em nome do liderado em outras telas) ainda vê tudo.

## Detalhes técnicos

**Arquivo único alterado:** `src/pages/lider/Avaliacoes.tsx`

Imports a adicionar:
```ts
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RhitmoTimelineCard } from '@/components/recaps/RhitmoTimelineCard';
import { MonthlyRecapSection } from '@/components/recaps/MonthlyRecapSection';
import { QuarterlyRecapSection } from '@/components/recaps/QuarterlyRecapSection';
import { PerformanceReviewList } from '@/components/PerformanceReviewList';
import { CreateFormalReviewDialog } from '@/components/review/CreateFormalReviewDialog';
import { Music, BarChart3, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
```

Estado novo:
```ts
const [activeSub, setActiveSub] = useState<'monthly' | 'quarterly' | 'formal'>('monthly');
const [formalDialogOpen, setFormalDialogOpen] = useState(false);
```

Para alimentar o `feedbacksLastMonthCount` do `RhitmoTimelineCard`, `useQuery` enxuto buscando `count` de `feedbacks` do liderado no mês passado (mesmo padrão do `MemberDetails` linhas 800–817, mas sem trazer o array todo — `select('id', { count: 'exact', head: true })` filtrado por `member_id` e `occurred_at` no range).

Action Bar onClick:
- Mensal → `setActiveSub('monthly')` + `scrollIntoView` opcional.
- Trimestral → `setActiveSub('quarterly')`.
- Formal → `setFormalDialogOpen(true)`. O `CreateFormalReviewDialog` recebe `memberId`, `memberName`, `open`, `onOpenChange` (verificar assinatura ao implementar — mesmo uso do `MemberDetails` linha 952).

## Memória a atualizar

Atualizar `.lovable/memory/design/dashboard/master-detail-pages.md` seção `/lider/avaliacoes` para refletir:
- Página é terminal (resolve geração inline, sem redirect).
- Action Bar de 3 botões + sub-tabs + timeline.
- Reutiliza `RhitmoTimelineCard`, `MonthlyRecapSection`, `QuarterlyRecapSection`, `PerformanceReviewList`, `CreateFormalReviewDialog` de `MemberDetails`.

## Risco / nota

`MonthlyRecapSection` e `QuarterlyRecapSection` foram desenhados pra viver dentro de `MemberDetails` com `max-w` mais largo. No `max-w-3xl` da página master-detail eles podem precisar de pequeno ajuste de padding interno — verifico ao implementar e, se necessário, faço um pass de polish (sem mudar a API dos componentes).
