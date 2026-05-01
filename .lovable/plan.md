## Contexto

A página `/lider/1on1s` **já implementa Master-Detail** (Sprint 12.1):
- `MemberMasterList` à esquerda (sticky 280px, ScrollArea, active state, mobile Sheet, footer "Novo liderado")
- Coluna direita com `OneOnOnePrepCard` (sugestões da Rhitmo via `get_team_timeline`), `UpcomingMeetingsCard`, `AgendaBlock` shared + private

O que ainda não bate com a referência Windmill/Notion:
1. Não há seção de **Action Items** (checklist).
2. `UpcomingMeetingsCard` é o card pesado do dashboard (toggle de transcrição, badges de plano, lista global) — quebra o respiro Notion e mostra reuniões de **todos** os liderados, não só do selecionado.
3. Pauta Compartilhada e Anotação Privada têm contraste invertido: a Shared hoje é colorida (verde), a Private é igual ao card. Pedido: Private com `bg-muted` + cadeado proeminente, Shared mais neutra.
4. Falta polish na hierarquia do header do liderado para ficar editorial (menos chrome).

## Mudanças

### 1. Novo componente `src/components/oneonone/MemberUpcomingMeetings.tsx`
Versão enxuta e filtrada por `memberId` das próximas 1:1s deste liderado.
- Reusa `useCalendarIntegration().upcomingMeetings` e filtra por `meeting.member_id === memberId`.
- Layout limpo: lista de até 3 próximas reuniões, badge "Hoje 14:00 / Amanhã 09:30 / dd/MM", link Meet, botão "Abrir brief". Sem toggle de auto-transcribe, sem "Desconectar", sem badge de plano.
- Empty state inline: "Nenhuma 1:1 agendada com {nome} nas próximas 48h."
- Estado "Calendar não conectado": uma linha discreta com link "Conectar Google Calendar".

### 2. Novo componente `src/components/oneonone/ActionItemsBlock.tsx`
Checklist simples persistido em `feedbacks` (sem alterar schema), seguindo o padrão de `AgendaBlock`:
- `tags: ['action-items-1on1']`, `visibility: 'shared'`, `title: 'Itens de ação 1:1'`, `type: 'manual'`, `source: 'manual'`.
- Estado local: array de `{ id, text, done }`. Usuário adiciona linhas via input + Enter, marca/desmarca, remove.
- Botão "Salvar itens de ação" serializa o array em markdown (`- [ ] item` / `- [x] item`) no `content` e insere uma nova linha em `feedbacks`. Não tenta editar registros antigos (mantém o padrão happy-path do AgendaBlock).
- Visual: card `rounded-2xl`, ícone `ListChecks`, badge "Compartilhado".

### 3. Ajustes em `src/components/oneonone/AgendaBlock.tsx`
Inverter o peso visual:
- **Shared**: card neutro (`bg-card`, borda sutil `border-border`), badge verde menor "Visível para o liderado", ícone `Eye` muted.
- **Private**: card com `bg-muted/50` + borda `border-dashed border-border/60`, ícone `Lock` mais proeminente (`text-foreground`), badge "Só você vê" em tom muted.
- Mantém todo o resto (refs, save, queryClient invalidations).

### 4. Refatorar `src/pages/lider/OneOnOnes.tsx`
Reordenar a coluna direita para o padrão Notion (escaneável, com white-space):
1. Eyebrow "1:1S" + header do liderado (avatar + h1 + role + botão "Abrir ficha")
2. **OneOnOnePrepCard** (sugestões da Rhitmo) — já existe
3. **MemberUpcomingMeetings** (novo, filtrado pelo liderado)
4. **AgendaBlock variant="shared"** (full-width, não mais grid 2-col)
5. **ActionItemsBlock** (novo)
6. **AgendaBlock variant="private"** (full-width, visualmente destacado pelo `bg-muted` + cadeado)
7. CTA "Histórico de 1:1s e notas" → `/member/{id}?tab=diary`

Empilhar full-width (em vez de grid 2-col) deixa mais respiro Notion-like dentro do `max-w-2xl`.

### 5. Atualizar memória `mem://design/dashboard/master-detail-pages`
Adicionar seção sobre /lider/1on1s especificamente:
- Ordem das seções na coluna direita
- Regra: Pauta Shared = neutra, Anotação Private = `bg-muted` + dashed (contraste inverso para reforçar privacidade)
- Action Items são append-only em `feedbacks` (não editam registros antigos)
- `MemberUpcomingMeetings` é a versão enxuta; o `UpcomingMeetingsCard` continua sendo usado só na Home (`/lider/inicio`)

## Fora de escopo (intencional)

- **Não** altero schema de `meetings`, `feedbacks` ou `context_evidence`.
- **Não** mexo em `MemberMasterList`, `EmptyMemberDetail`, `OneOnOnePrepCard` (já estão no padrão).
- **Não** mexo em `/lider/diario` nem `/lider/objetivos` (mesmo padrão Master-Detail, fora do pedido).
- **Não** mexo em `/lider/inicio` (Home V3 — `UpcomingMeetingsCard` continua lá com toggle/badges).

## Arquivos

- novo: `src/components/oneonone/MemberUpcomingMeetings.tsx`
- novo: `src/components/oneonone/ActionItemsBlock.tsx`
- editar: `src/components/oneonone/AgendaBlock.tsx` (cores Shared/Private)
- editar: `src/pages/lider/OneOnOnes.tsx` (ordem + componentes novos)
- editar: `.lovable/memory/design/dashboard/master-detail-pages.md`
