---
name: Peer Review Request & Response UI
description: Líder solicita peer review (cria 1 review-pai + N convites em review_peers); pares respondem 3 perguntas no próprio dashboard (Sprint 10.3)
type: feature
---

# Sprint 10.3 — Peer Review UI

## Componentes
- `src/lib/peerReviewQuestions.ts` — array estático de 3 perguntas (strengths, improvement, collab).
- `src/components/peer-review/RequestPeerReviewModal.tsx` — modal do líder com Select de liderado + multi-select de pares (botões toggleable).
- `src/components/peer-review/RequestPeerReviewButton.tsx` — trigger reutilizável (variant `outline`, ícone Users).
- `src/components/peer-review/PendingPeerReviewsAlert.tsx` — card sky no topo do `DirectReportDashboard` (logo abaixo do `PendingPulseAlert`).
- `src/components/peer-review/AnswerPeerReviewModal.tsx` — modal do par com 3 Textareas obrigatórios.
- `src/hooks/usePendingPeerReviews.ts` — query `review_peers` filtrando `peer_user_id = auth.uid() AND status='pending'` com join aninhado para obter nome do membro avaliado.

## Pontos de inserção
- `/lider/contexto` (header): `<RequestPeerReviewButton/>` ao lado do `<SendPulseButton/>`.
- `DirectReportDashboard`: `<PendingPeerReviewsAlert/>` logo após `<PendingPulseAlert/>`.

## Fluxo do líder (RequestPeerReviewModal)
1. Query `peer-review-target-members` → liderados diretos do líder via `team_members.workspace_id` + `teams.leader_user_id = userId` (mesmo padrão do Pulse).
2. Query `peer-review-candidates` → todos `team_members` do workspace COM `linked_user_id NOT NULL`, excluindo liderado-alvo e o próprio líder. Retorna `{ user_id: linked_user_id, name }`.
3. Submit em 2 passos:
   - **A) INSERT performance_reviews** (`review_type='peer'`, `author_user_id`, `shared_with_member=false`, `period_type='manual'`, `title='Avaliação de Pares: {nome} — {data}'`) com `.select('id').single()`.
   - **B) INSERT review_peers** (array) com `review_id` + cada `peer_user_id` + `status='pending'`.
   - **Rollback manual** se B falha: `DELETE from performance_reviews where id = createdReviewId`.

## Fluxo do par (AnswerPeerReviewModal)
- UPDATE `review_peers`:
  ```
  status='completed', completed_at=now(),
  response_jsonb = { questions: [{id, question, answer}], submitted_at }
  ```
- Trigger `review_peers_restrict_peer_update` (Sprint 10.1): peer pode mudar `status` → completed/declined e gravar `response_jsonb`. `completed_at` é forçado pelo trigger se nulo.

## RLS / Triggers da Sprint 10.1 reutilizados
- `review_peers_select`: peer próprio + líder/owner/HR + admin.
- `review_peers_insert_leader`: somente líder do membro avaliado ou owner.
- `review_peers_update`: peer ou líder/owner.
- `review_peers_validate_workspace` (BEFORE INSERT): `peer_user_id` deve ser `linked_user_id` em `team_members`, `owner_id` em `workspaces`, em `hr_admin_ids`, ou `leader_user_id` em `teams` do mesmo workspace. → Por isso o multi-select filtra `linked_user_id NOT NULL`.

## Fora de escopo
- UI do líder para revisar/consolidar respostas dos pares (Sprint 10.4).
- Compartilhar peer review consolidada com o liderado (`shared_with_member=true` aciona `ctx_evidence_from_review` automaticamente).
- Notificação Slack/email aos pares convidados.
- Sumarização AI das respostas.
- Upwards review (liderado avaliando líder) — Sprint 10.4.
