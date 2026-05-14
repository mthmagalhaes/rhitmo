## Decisão de produto

A aba **1:1s** vira **Pessoas** — o único lugar onde o líder navega seu time. Hoje ela duplica o "Próximas 1:1s" da Home e força dois cliques (1:1s → liderado) pra chegar onde a vida realmente acontece: a ficha (`/member/:id`).

Nova regra: **um clique no item de sidebar → lista densa de liderados → clique no liderado → ficha**. A ficha absorve o que era valioso da tela intermediária.

## O que muda

### 1. Sidebar e rota

- Item `1on1s` da sidebar do líder vira **Pessoas** (ícone `Users`), apontando para `/lider/pessoas`.
- `/lider/1on1s` continua existindo por enquanto (rota legada redireciona pra `/lider/pessoas`), pra não quebrar links salvos / Slack / e-mails.
- `/lider/pessoas` hoje (a tela de convites/onboarding em massa) é renomeada internamente — a UI de convites segue acessível via dropdown do workspace switcher (já é o padrão da memória `workspace-switcher-actions`) e pela aba "Convites" dentro da nova Pessoas.

### 2. Nova `/lider/pessoas` — lista densa estilo Tako/Windmill

Página full-bleed (sem master-detail), com header editorial + tabela densa.

Layout:

```text
┌──────────────────────────────────────────────────────────┐
│  Pessoas · Liderados                                     │
│  Resumo do seu time. Clique para abrir a ficha.          │
│                                                          │
│  [ 🔍 Procurar ]  [ Filtrar ▾ ]   Mostrando 12 de 12     │
│                                                          │
│  Todos (12)    Convites (3) │
│  ───────────────────────────────────────────────         │
│  Nome              Cargo         Time      Última 1:1    │
│  ● Gabriela Lucas  Analista BO   Ops       há 4 dias   › │
│  ● Giovanna B.     Head CG       Growth    há 12 dias  › │
│  ○ Guilherme C.    CSM           CS        há 22 dias  › │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

- Densidade Linear/Notion: linhas de 44px, avatar sm, `bg-muted/30` no header, hover sutil.
- Bolinha de saúde (`fresh / warm / cold`) reutilizando lógica já existente em `MemberMasterList`.
- Colunas: Nome (avatar + nome + saúde), Cargo, Time, Última 1:1 (ou "Último sinal"), chevron.
- Clique na linha → `navigate('/member/:id')`.
- Tab **Convites** mostra a lista de convites pendentes/aceitos (conteúdo atual de `/lider/pessoas`).
- Filtros: time (Select), status do convite, "sem 1:1 há 14+ dias".
- Footer-row sutil "Novo liderado" abre o `NewMemberDialog` já existente.

### 3. Ficha do liderado (`/member/:id`) absorve o que era exclusivo da 1:1s

Hoje a página `LiderOneOnOnes` tem três blocos que ainda fazem sentido — eles migram pra ficha, no topo da aba **1:1s** dela:

- `OneOnOnePrepCard` (sugestões da Rhitmo)
- `MemberUpcomingMeetings` (próximas reuniões deste liderado)
- `SlackActivityCard` (sinais ambient dos últimos 7 dias)

Posicionamento na ficha: criar (ou reorganizar) a aba **"1:1"** dentro do `Tabs` de `MemberDetails`, com ordem:

1. AI Prep (`OneOnOnePrepCard`)
2. Próximas reuniões (`MemberUpcomingMeetings`)
3. Atividade no Slack (`SlackActivityCard`)
4. Histórico de 1:1s (já existe via `?tab=diary`)

### 4. O que morre

Conforme pedido, removemos da experiência:

- `AgendaBlock` compartilhada (pauta)
- `ActionItemsBlock` (itens de ação)
- `AgendaBlock` privada (anotação privada)

Os componentes ficam no repo por enquanto (caso a gente queira reaproveitar nos briefs/recall), mas saem de qualquer rota viva. Nada de migração de dados nesta etapa — só desuso na UI.

### 5. Página de teste antes da migração

Antes de mexer na sidebar e em `/lider/1on1s`, entrego `**/lider/pessoas-v2**` como rota oculta (não aparece na sidebar, acessível pela URL). Você abre, testa a navegação um-clique pra ficha, valida densidade/colunas/filtros, e só então:

- promovemos `/lider/pessoas-v2` → `/lider/pessoas`
- renomeamos sidebar `1on1s` → `Pessoas`
- redirecionamos `/lider/1on1s` → `/lider/pessoas`
- migramos os 3 blocos pra ficha e apagamos os 3 blocos mortos

## Detalhes técnicos

- **Reaproveitar** `useLeaderMembers` (já entrega workspace + teams + members + last_feedback_date). Não precisa de nova query.
- **Nova rota** `/lider/pessoas-v2` em `src/App.tsx` apontando para `src/pages/lider/PessoasV2.tsx` (novo arquivo).
- **Componente** `PeopleTable` (novo, em `src/components/leader/PeopleTable.tsx`) — tabela densa shadcn, sem master-detail, sem sidebar lateral. Reutiliza `MemberAvatar` e o helper de "health".
- **Tabs**: Todos / Diretos / Indiretos / Convites. "Diretos" = membros do(s) time(s) onde o `effective_user_id` é `leader_user_id`; "Indiretos" = demais membros do workspace visíveis. Convites = consulta atual da página `/lider/pessoas` (filtro por `invite_status`).
- **Ficha**: editar `src/pages/MemberDetails.tsx` para adicionar/promover aba "1:1" e renderizar os três componentes existentes (`OneOnOnePrepCard`, `MemberUpcomingMeetings`, `SlackActivityCard`) — apenas mover imports, props já são compatíveis (`memberId`, `workspaceId`).
- `**LiderOneOnOnes**`: após validação, substituir conteúdo por `<Navigate to="/lider/pessoas" replace />`. Sidebar atualiza `labelKey` e `to` em `src/lib/navigation.ts`.
- **i18n**: adicionar `nav.lider.pessoas` em `pt-BR/en/es` (já existe `nav.lider.um_pra_um` — mantém pra compat até remoção).
- **Memória**: depois da promoção, atualizar `mem://design/dashboard/master-detail-pages` removendo `/lider/1on1s` do conjunto master-detail e criar `mem://features/people/pessoas-page` documentando o novo padrão.

## Entregáveis desta fase (página de teste)

1. `src/pages/lider/PessoasV2.tsx` — nova página
2. `src/components/leader/PeopleTable.tsx` — tabela densa
3. Rota oculta `/lider/pessoas-v2` em `src/App.tsx`
4. Sem mudanças na sidebar, sem mexer em `/lider/1on1s`, sem tocar em `MemberDetails` ainda

Você abre `/lider/pessoas-v2`, valida, e na fase 2 a gente migra de verdade (sidebar + ficha + morte dos blocos).

## Pergunta única antes de codar

Na lista densa, como você quer rotular a coluna de "saúde" da relação? Opções:

- **"Última 1:1"** (data da última reunião com bot/transcrição)
- **"Último sinal"** (data do último feedback/nota/pulse — é o que `last_feedback_date` já entrega hoje)
- Ambas, em colunas separadas

Default que vou adotar se você não responder: **"Último sinal"** (1 coluna, usa `last_feedback_date`), porque é o dado já consolidado e cobre 1:1 + nota + pulse + Slack.