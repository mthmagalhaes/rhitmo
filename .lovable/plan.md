## Refator Master-Detail: 1:1s, Diário e Objetivos

Migrar três páginas do líder (`/lider/1on1s`, `/lider/diario`, `/lider/objetivos`) do padrão "grid de cards → navegar para `/member/:id`" para um layout **Master-Detail**: lista vertical fixa de liderados à esquerda, conteúdo do liderado selecionado à direita. O `/member/:id` continua existindo como deep link, mas deixa de ser o caminho principal nessas páginas.

### 1. Componente compartilhado novo: `MemberMasterList`

`src/components/leader/MemberMasterList.tsx`

- Reaproveita os hooks de fetch já existentes em `MembersGrid.tsx` (workspace + teams + members), extraindo-os para um hook utilitário `useLeaderMembers()` em `src/hooks/useLeaderMembers.ts` para evitar duplicação.
- Renderiza:
  - Header curto (título passado por prop + botão `+` para `NewMemberDialog`).
  - Filtro `TeamTabs` opcional (compacto, horizontal scroll).
  - `ScrollArea` com lista vertical de liderados:
    - Avatar (`MemberAvatar`), nome, role pequeno, dot de saúde (reusar `health-status-logic`: 7d / 8–14d / +14d).
    - Item ativo destacado com `bg-primary/10` + borda esquerda.
  - Botão "Novo liderado" no rodapé.
- Props: `selectedMemberId`, `onSelect(memberId)`, `getBadge?(member) => ReactNode` (para badges contextuais por página, ex.: contagem de notas).
- `sticky top-0 self-start max-h-[calc(100vh-...)]` para manter fixo durante scroll do detalhe.
- Largura: `w-[320px] shrink-0` em desktop. Em mobile (<lg), vira um `Sheet` lateral acionado por botão "Liderados".

### 2. Página `/lider/1on1s` (refator)

`src/pages/lider/OneOnOnes.tsx`

Layout:
```text
+------------------+----------------------------------+
| MemberMasterList | Detalhe do liderado selecionado   |
| (sticky, 320px)  | (flex-1, scroll próprio)          |
+------------------+----------------------------------+
```

Lado direito (quando há liderado selecionado):
1. **Cabeçalho**: Avatar grande + nome + role + botão "Abrir ficha completa" (deep link para `/member/:id`).
2. **Card AI Prep — "Sugestões da Rhitmo"** (novo componente `OneOnOnePrepCard.tsx`):
   - Usa `useTeamTimeline({ workspaceId, memberIds: [selectedId], pageSize: 10 })` para puxar evidências recentes do `context_evidence`.
   - Renderiza até 3 sugestões de pauta derivadas das últimas evidências (título do evento + chip da fonte). Sem chamada extra de IA nesta sprint — é um "prep determinístico" que mostra os tópicos quentes. Texto explicativo: "Tópicos sugeridos a partir das evidências recentes."
   - Botão "Adicionar à pauta" copia o item para o textarea da Pauta Compartilhada.
3. **Próximas reuniões deste liderado**: filtra `UpcomingMeetingsCard` por `member` (se a integração de Calendar estiver conectada). Se não houver match, mostra empty state curto + link para Configurações → Integrações.
4. **Pauta Compartilhada** (novo bloco):
   - Card com header verde claro + ícone `Eye` + label `Visível para o liderado`.
   - `Textarea` controlado salvando em `feedbacks` com `visibility='shared'`, `tags=['pauta-1on1']`, `member_id=selected.id`. Reutiliza o fluxo do `NewNoteDialog` (chama o handler programaticamente) para não duplicar lógica de salvamento.
5. **Anotação Privada** (novo bloco):
   - Card com header neutro + ícone `Lock` + label `Só você vê`.
   - Mesmo padrão acima, mas `visibility='private_leader'`, `tags=['anotacao-privada-1on1']`.
6. **Histórico de 1:1s**: lista das últimas reuniões do membro (filtrar `feedbacks` por tag `1on1` / `pauta-1on1`, usar `FeedbackTimeline` em modo compacto). Item clicável abre `/member/:id?tab=diary`.

Empty state (sem liderado): card centralizado com ícone `Users`, "Selecione um liderado para ver o histórico, preparar a próxima 1:1 ou adicionar notas".

Banner de Calendar não conectado é movido para dentro do detalhe, no topo do bloco "Próximas reuniões".

### 3. Página `/lider/diario` (refator)

`src/pages/lider/Diario.tsx`

Mesmo layout master-detail. Foco em privacidade (estética Windmill).

- **Banner fixo no topo da coluna direita** (sempre visível, não fecha):
  - Card com fundo `bg-muted/40`, ícone `Lock` + texto **"Notas 100% privadas — visíveis apenas para você"**.
- **Filtros** (`FeedbackFilters` reutilizado).
- **Botão primário** "Nova nota" abre `NewNoteDialog` com `selectedMemberId` pré-preenchido. Forçar `defaultVisibility='private_leader'` ao chamar daqui (passar prop nova ao Dialog se ainda não existir; caso contrário, manter o comportamento atual e apenas exibir o badge "Privado").
- **Feed**: `FeedbackTimeline` filtrado para mostrar apenas `visibility='private_leader'`. Cada card recebe um selo `Lock + "Privado"` — adicionar via prop `forcePrivateBadge` no `FeedbackTimeline` (ou wrapper local) sem alterar a lógica de toggle existente.

Empty state: "Selecione um liderado para abrir o diário privado".

### 4. Página `/lider/objetivos` (refator leve)

`src/pages/lider/Objetivos.tsx`

Mesmo layout master-detail.
- Coluna direita: cabeçalho do liderado + `GoalsManager memberId={selected.id}` (componente já existente em `MemberDetails`). Botão "Novo objetivo" no topo abre `NewGoalDialog`.
- Empty state: "Selecione um liderado para ver e criar objetivos".

### 5. Componentes auxiliares

- `src/hooks/useLeaderMembers.ts`: extrai as 3 queries de `MembersGrid` (workspace, teams, members + last feedback). Retorna `{ workspace, teams, members, isLoading }`.
- `src/components/leader/MemberMasterList.tsx`: descrito acima.
- `src/components/leader/EmptyMemberDetail.tsx`: empty state ilustrativo reutilizado pelas 3 páginas (ícone + título + subtítulo via props).
- `src/components/oneonone/OneOnOnePrepCard.tsx`: card de sugestões a partir de `useTeamTimeline`.
- `src/components/oneonone/SharedAgendaBlock.tsx` e `PrivateNoteBlock.tsx`: blocos de pauta/anotação que persistem em `feedbacks` reusando a lógica de `NewNoteDialog` (importar a função de submit ou usar uma versão "inline" curta com `supabase.from('feedbacks').insert(...)`).

### 6. Pontos de estabilidade

- **Sem mudança de schema**: usa `feedbacks` (visibility shared/private_leader) e `context_evidence` via RPC `get_team_timeline` que já existem.
- `MembersGrid` continua existindo e funcional para outras páginas (`Avaliacoes`, `Pessoas`).
- Rotas do `App.tsx` permanecem iguais. Deep link `/member/:id` continua sendo a "ficha completa".
- Persistência: nada de novo handler de salvar — usar o caminho atual (`supabase.from('feedbacks').insert`) idêntico ao `NewNoteDialog`, com `invalidateQueries(['feedbacks', selectedId])`.
- Layout: usar `flex` com `min-h-[calc(100vh-4rem)]` no container; lado esquerdo `sticky top-16 self-start`. Quebrar para coluna única em `<lg` com botão "Liderados" abrindo `Sheet`.
- Reuso Shadcn: `ScrollArea`, `Separator`, `Avatar`, `Card`, `Sheet`, `Badge`, `Textarea`.

### 7. Memória

Adicionar `mem://design/dashboard/master-detail-pages` documentando o padrão e quais páginas o usam, e atualizar o índice.

### Arquivos editados/criados

- novo `src/hooks/useLeaderMembers.ts`
- novo `src/components/leader/MemberMasterList.tsx`
- novo `src/components/leader/EmptyMemberDetail.tsx`
- novo `src/components/oneonone/OneOnOnePrepCard.tsx`
- novo `src/components/oneonone/SharedAgendaBlock.tsx`
- novo `src/components/oneonone/PrivateNoteBlock.tsx`
- editado `src/pages/lider/OneOnOnes.tsx` (reescrita completa)
- editado `src/pages/lider/Diario.tsx` (reescrita completa)
- editado `src/pages/lider/Objetivos.tsx` (reescrita completa)
- editado `src/components/leader/MembersGrid.tsx` (refator interno para usar `useLeaderMembers`, sem mudar a API pública)
- novo `.lovable/memory/design/dashboard/master-detail-pages.md` + atualização de `mem://index.md`

### Fora de escopo

- IA generativa para o card de prep (fica como sugestões determinísticas baseadas em evidências; geração via LLM pode ser uma sprint seguinte usando `generate-brief`).
- Mudanças em `MemberDetails.tsx` (continua intocado).
- Qualquer alteração em RLS ou tabelas Supabase.