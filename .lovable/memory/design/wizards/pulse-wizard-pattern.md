---
name: Pulse Wizard Pattern
description: Padrão validado para wizards multi-step full-screen (5 passos, header limpo, progresso fino, navegação Voltar/Próximo)
type: design
---

Padrão de Wizard estabelecido em `src/components/pulse/PulseWizard.tsx` (Sprint 13.x), inspirado no Windmill e validado pelo usuário. Reaproveitar para futuros wizards (onboarding de features, configuração de integrações, criação de objetos complexos).

## Estrutura
- **Container:** `<Dialog>` + `<DialogContent>` com `max-w-none w-screen h-screen p-0 rounded-none border-0 flex flex-col` (full-screen).
- **Close:** o botão X **vem nativo do `DialogContent`** (shadcn). NÃO adicionar X manual no header — caso contrário aparecem 2 Xs.
- **Header:** `flex items-center px-6 py-4 border-b` apenas com o título à esquerda (ex.: `Pulse Setup`), sem botões à direita.
- **Conteúdo:** `flex-1 overflow-y-auto` + `max-w-3xl mx-auto px-6 py-12`. Eyebrow em uppercase tracking-[0.18em] (`Step N of M`) + título serif `text-2xl font-serif tracking-tight`.
- **Footer fixo:** barra de progresso fina (`h-1 bg-muted` com `bg-primary` proporcional) seguida de `flex items-center justify-between px-6 py-4` com `Voltar` (ghost, esquerda) e `Próximo` (primary `rounded-xl`, direita).

## Passos
- 5 é o sweet spot. Cada passo tem 1 decisão central + opcionalmente um catálogo de "Ideias" / presets para reduzir fricção.
- Validação por passo via `canNext = useMemo(...)`.
- Reset de estado quando `open` muda (e não está editando).

## Reordenação de itens
- Sempre que aparecer `GripVertical`, plugar `@dnd-kit/core` + `@dnd-kit/sortable` (já instalados). Nunca deixar handle decorativo. Padrão:
  - `useSensor(PointerSensor, { activationConstraint: { distance: 4 } })`.
  - Componente `SortableX` separado com `useSortable({ id })`, `attributes`/`listeners` no botão handle (`cursor-grab active:cursor-grabbing touch-none`).
  - `arrayMove` no `onDragEnd`.

## Queries de membros do líder
- **CUIDADO:** `team_members` NÃO tem coluna `workspace_id`. O filtro tem que ir via join: `.select('id, name, teams!inner(workspace_id, leader_user_id)').eq('teams.workspace_id', workspaceId).eq('teams.leader_user_id', userId)`. Filtrar por `.eq('workspace_id', ...)` direto retorna 0 silenciosamente.
