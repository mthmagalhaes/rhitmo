---
name: Pulse Surveys UI (Sprint 9.2)
description: Disparo do Pulse pelo líder via SendPulseModal e resposta do liderado via PendingPulseAlert + AnswerPulseModal
type: feature
---

UI sobre `pulse_surveys` (Sprint 9.1). Sem Edge Function — usa cliente Supabase autenticado direto, RLS faz o gating.

## Ponto de entrada do líder
- `<SendPulseButton/>` montado na barra sticky de filtros em `/lider/contexto` (canto direito).
- Abre `SendPulseModal` com select de liderado (filtrado por `teams.leader_user_id = effective_user_id`) e select de tipo (4 templates).
- Insert direto: `pulse_surveys.insert({ workspace_id, member_id, requested_by, type, questions: PULSE_TEMPLATES[type].questions, status: 'pending' })`.

## Ponto de entrada do liderado
- `<PendingPulseAlert memberId={linkedMember.id}/>` no topo da TabsContent "visao-geral" do `DirectReportDashboard`.
- Hook `usePendingPulseSurveys(memberId)` → query `pulse_surveys` com `member_id = X AND status = 'pending'`.
- Ao clicar, abre `AnswerPulseModal`: textarea por questão, submit faz UPDATE `{ status: 'completed', completed_at, responses: [{question_id, question_text, answer}] }`. A trigger `ctx_evidence_from_pulse_survey` propaga para `context_evidence` automaticamente.

## Catálogo de perguntas
`src/lib/pulseTemplates.ts` — fonte única de verdade para as 4 categorias (`blockers`, `priorities`, `retro`, `goal_progress`). IDs estáveis (`q1`, `q2`, ...) são persistidos em `responses[].question_id` para evolução do texto sem perder histórico.

## Invalidações de cache
Após insert/update: invalida `['pending-pulse-surveys']` e `['team-timeline']` (feed do Contexto reflete o novo evidence em tempo real).

## Fora de escopo (futuro)
- AI gera `summary.tldr` (edge function `summarize-pulse`).
- Notificação Slack/email ao liderado.
- Expiração automática (`expires_at` + cron para `status='expired'`).
