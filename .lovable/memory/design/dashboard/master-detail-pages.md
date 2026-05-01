---
name: Master-Detail Pages
description: Master-Detail layout (lista de liderados à esquerda + detalhe à direita) usado em /lider/1on1s, /lider/diario e /lider/objetivos. Substitui o padrão antigo de grid → /member/:id como entrada principal.
type: design
---

## Padrão

- Componente central: `src/components/leader/MemberMasterList.tsx`. Lista vertical sticky de 320px no desktop; vira `Sheet` com trigger no header em telas <lg.
- Hook compartilhado: `src/hooks/useLeaderMembers.ts` (workspace + teams + members + last_feedback_date) — única fonte de verdade.
- Dot de saúde por liderado: `<=7d fresh (emerald)`, `<=14d warm (amber)`, `>14d cold (rose)`.
- Empty state: `src/components/leader/EmptyMemberDetail.tsx`.

## Páginas

- **/lider/1on1s**: cabeçalho do liderado + `OneOnOnePrepCard` (sugestões determinísticas via `useTeamTimeline`/`get_team_timeline` RPC) + `UpcomingMeetingsCard` + dois `AgendaBlock` (variant `shared` com `visibility='shared'` e tag `pauta-1on1`; variant `private` com `visibility='private_leader'` e tag `anotacao-privada-1on1`). O botão "Pauta" no card de prep injeta a sugestão via `appendLine` no bloco compartilhado.
- **/lider/diario**: foco em privacidade. Banner fixo "Notas 100% privadas". Lista filtrada para `visibility='private_leader'`. Reutiliza `NewNoteDialog` e `FeedbackTimeline`.
- **/lider/objetivos**: reusa `GoalsManager` + `NewGoalDialog`.

## Decisões importantes

- `/member/:id` continua como deep link de "ficha completa". Botão "Abrir ficha" em cada detalhe.
- Persistência inline em `feedbacks` segue o esquema do `NewNoteDialog`: `manager_id`, `member_id`, `type='manual'`, `source='manual'`. Não há coluna `workspace_id` em `feedbacks`.
- Sem novas tabelas. Sem mudanças de RLS.
