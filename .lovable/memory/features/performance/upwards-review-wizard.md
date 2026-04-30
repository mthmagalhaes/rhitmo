---
name: Upwards Review Wizard
description: Liderado avalia o líder via chat conversacional; INSERT em performance_reviews com review_type='upwards' e member_id=linkedMember.id (Sprint 10.4)
type: feature
---

# Sprint 10.4 — Upwards Review (Liderado avalia o Líder)

## Decisão chave: `member_id` na review upwards
- `member_id = linkedMember.id` (mesmo padrão da self-review).
- A RLS "Linked members can insert own self upwards reviews" só exige `author_user_id = auth.uid()` e que o autor seja um team_members linkado — **não** força member_id ser o líder.
- A trigger `ctx_evidence_from_review` propaga a evidência para o líder do `member_id` via `is_team_leader`. Como o liderado é team_member do líder avaliado, o feedback aparece no `/lider/contexto` do líder correto.
- Não houve mudanças no banco — toda a fundação veio na Sprint 10.1.

## Componentes
- `src/lib/upwardsReviewQuestions.ts` — 3 perguntas estáticas: helps / could_improve / communication_clarity.
- `src/hooks/useLeaderInfo.ts` — resolve `teams.leader_user_id` a partir de `team_members.id`. Tenta nome do líder via `team_members.linked_user_id` (fail-soft, sem `profiles`).
- `src/components/upwards-review/UpwardsReviewWizard.tsx` — clone do SelfReviewWizard com ícone `ArrowUpRight`, copy de liderança e título "Feedback ascendente — {liderado} → {líder} — {data}".
- `src/components/upwards-review/StartUpwardsReviewCard.tsx` — só renderiza se `useLeaderInfo` retorna `leaderUserId != null`. Variant outline + bg accent/10.

## Mudanças no DirectReportDashboard
- Query `shared-reviews`: agora exclui ambos self **e** upwards via `.not('review_type', 'in', '(self,upwards)')` para não confundir feedback do líder com autoria do próprio liderado.
- Nova query `my-upwards-reviews` filtra `review_type='upwards' AND author_user_id = user.id`.
- Nova sub-seção "Seus feedbacks ascendentes" lista os upwards (reaproveita o Dialog de leitura `selectedReview`).
- Card `<StartUpwardsReviewCard>` aparece logo abaixo do `<StartSelfReviewCard>`.

## Trigger restrição self/upwards
A função `performance_reviews_restrict_self_upwards_update` continua protegendo: como o liderado **não** é leader de si próprio, ele cai no caminho restrito e não pode mutar `member_id`/`review_type`/`author_user_id` após criar.

## Fora de escopo
- Anonimização/agregação para o líder (Sprint 10.5).
- Sumarização AI antes do envio.
- Notificação por e-mail ao líder.
- Acesso à `profiles` (não existe no schema público do projeto).
