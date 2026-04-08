

## Migração dos 3 Dashboards para Design V2 + Avatar Library para Liderados

### Escopo

1. **Migrar o dashboard do Líder** (`Index.tsx`) para usar o layout/design do `DashboardV2.tsx` (hero strip, overline labels, cards horizontais, meetings como chips), preservando TODAS as funcionalidades existentes (TeamTabs, EditWorkspace, EditMember, DeleteTeam, DropdownMenu de settings, PendingInvites, UpgradeBanner, ActivitySheet, Slack invites, calendar callback, subscription badge)
2. **Migrar o dashboard do Liderado** (`DirectReportDashboard.tsx`) para o mesmo design language (hero strip com overline, seções com spacing generoso, font-serif nos títulos)
3. **Migrar o dashboard do HR Admin** (`HRDashboard.tsx`) para o mesmo design language
4. **Criar biblioteca de 20+ avatares ilustrados** e editor no perfil do liderado
5. **Remover** `DashboardV2.tsx` e sua rota temporária após migração

### Alterações por arquivo

#### 1. `src/pages/Index.tsx` — Líder (arquivo principal, ~650 linhas)
Reescrever o layout visual usando o padrão V2, MAS manter:
- Todos os estados (`editWorkspaceOpen`, `newTeamOpen`, `editMemberOpen`, `editTeamOpen`, `deleteTeamOpen`, `leaderSyncOpen`, `activitySheetOpen`, `selectedMember`, `activeTeamId`)
- `TeamTabs` com filtro por time
- `UpgradeBanner`
- `PendingInvitesSection`
- `ActivityPreview` + `ActivitySheet`
- `EditWorkspaceDialog`, `NewTeamDialog`, `EditMemberDialog`, `EditTeamDialog`, `DeleteTeamDialog`
- `LeaderSyncWizard`
- Subscription badge
- Slack invite flow (`handleSendSlackInvite`)
- Calendar callback (`useEffect` para `?calendar=connected`)
- Team settings dropdown (rename/delete)
- Member cards com `TeamMemberCard` (mantendo `onEdit`, `onClick`, `pendingInvite`, `onSendInvite`)
- Empty state com vídeo YouTube
- Legenda de cores (health dots)

O que muda visualmente:
- Header → Hero strip com overline "DASHBOARD", saudação serif, micro-métricas, pill CTAs
- Meetings → Seção com overline "PRÓXIMAS 1:1s" + chips horizontais (do V2)
- Time → Overline "SEU TIME" + grid 2 colunas com cards horizontais (mas MANTENDO o `TeamMemberCard` existente com suas props completas)
- Activity + Invites → Seção lateral ou abaixo com overline label
- Spacing entre seções: `mb-12`, padding `py-10`

#### 2. `src/components/dashboard/DirectReportDashboard.tsx` — Liderado (~1193 linhas)
Aplicar design language V2 ao header e tabs:
- Header → Hero strip com overline "MEU PAINEL", saudação serif (`font-serif`), subtítulo contextual, "Meu Rhitmo" como pill button
- Tab triggers → Estilo mais limpo com `tracking-[0.2em]` uppercase
- Cards internos → Manter todos os cards, dialogs, funcionalidades (Pulse, Actions, PDI, Skills Map, Feedbacks, Reviews, Sync Dialog, MentorChat)
- Nenhuma funcionalidade removida

#### 3. `src/pages/HRDashboard.tsx` — HR Admin (~239 linhas)
Aplicar design language V2:
- Header → Hero strip com overline "PAINEL DE LIDERANÇA", título serif, workspace name como subtítulo
- MetricCards → Manter grid 5 colunas, aplicar `rounded-2xl border border-border shadow-sm` em vez de `bg-white/80 rounded-3xl`
- Seções → Adicionar overline labels ("PONTOS DE ATENÇÃO", "ATIVIDADE DOS LÍDERES", "MATURIDADE")
- Nenhuma funcionalidade removida

#### 4. `src/components/avatar/AvatarLibrary.tsx` — Novo
Componente com grid de 20+ avatares ilustrados SVG/DiceBear (estilo `notionists`, `fun-emoji`, `lorelei`, `avataaars`). Cada avatar é um seed predefinido renderizado via DiceBear API. O liderado clica para selecionar e salvar no `team_members.avatar` via update.

#### 5. `src/components/dashboard/DirectReportDashboard.tsx` — Perfil tab (adição)
Na tab "Meu Perfil", adicionar seção "Meu Avatar" acima de "Informações da Função":
- Avatar grande atual + botão "Trocar Avatar"
- Ao clicar, abre dialog/sheet com `AvatarLibrary` grid
- Seleção salva diretamente no DB via `supabase.from('team_members').update({ avatar: selectedUrl })`

#### 6. `src/pages/DashboardV2.tsx` — Remover
Delete do arquivo protótipo.

#### 7. `src/App.tsx` — Limpar rota
Remover import e rota `/dashboard-v2`.

### Funcionalidades preservadas (checklist)

| Funcionalidade | Status |
|---|---|
| TeamTabs (filtro por time) | Mantido |
| EditWorkspaceDialog | Mantido |
| NewTeamDialog | Mantido |
| EditMemberDialog | Mantido |
| DeleteTeamDialog | Mantido |
| TeamMemberCard com todas as props | Mantido |
| Slack invite flow | Mantido |
| Calendar callback | Mantido |
| Subscription badge | Mantido |
| UpgradeBanner | Mantido |
| PendingInvitesSection | Mantido |
| ActivityPreview + ActivitySheet | Mantido |
| LeaderSyncWizard | Mantido |
| SetupChecklist | Mantido |
| Empty state com vídeo | Mantido |
| Health dot legend | Mantido |
| DirectReport: 4 tabs completas | Mantido |
| DirectReport: Sync Dialog | Mantido |
| DirectReport: MentorChat | Mantido |
| DirectReport: PDI Dialog | Mantido |
| DirectReport: Review Dialog | Mantido |
| HR: MetricCards, Alertas, Atividade, Maturidade | Mantido |

### Avatar Library — 20 avatares
Usando DiceBear API com seeds predefinidos e estilos variados (`notionists`, `fun-emoji`, `lorelei`), gerando URLs determinísticas. Sem necessidade de upload ou storage — são URLs públicas.

### Notas técnicas
- Zero migrações SQL — campo `avatar` já existe em `team_members`
- O update do avatar usa o update direto via Supabase client (RLS já permite o liderado atualizar via `linked_user_id`)
- Design tokens: `font-serif` para títulos, `tracking-[0.2em]` uppercase para overlines, `mb-12` entre seções, `rounded-2xl` para cards

