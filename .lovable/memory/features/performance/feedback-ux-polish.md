---
name: Feedback Ecosystem UX Polish (Sprint 10.5 + 10.6)
description: Sanity check pós-Sprint 10.x — guards de submit, invalidações, redireciona páginas Pulse fantasmas, auto-scroll dos wizards e discard-confirm consistente
type: feature
---

Auditoria completa do "wiring" frontend dos módulos Pulse, Self/Peer/Upwards Review.

## Sprint 10.5 — Correções aplicadas
1. `/lider/pulse` e `/liderado/pulse` redirecionam para `/lider/contexto` e `/liderado` (eram páginas fantasmas).
2. `/liderado/avaliacoes` aba "Para revisar" deixou de renderizar `<Index/>` inteiro; agora aponta para o painel.
3. `AnswerPulseModal` e `SendPulseModal`: guarda `!submitting` no overlay close; SendPulse reseta estado on open.
4. `AnswerPeerReviewModal`: invalida `team-timeline` (peer reviews completas geram ctx_evidence — Sprint 10.1 trigger).
5. `RequestPeerReviewModal`: empty state inline para "sem liderados" (não escondido dentro do Select).
6. `SelfReviewWizard` + `UpwardsReviewWizard`: substituído `<ScrollArea>` por `<div overflow-y-auto>`. Botão "Sair" mid-flow com confirmação via toast quando há respostas.
7. `useLeaderInfo`: lookup do nome do líder respeita `workspace_id` ativo (multi-tenant safety).
8. `DirectReportDashboard` seção "Avaliações Formais": ordem invertida — reviews do líder antes dos cards de iniciar self/upwards.

## Sprint 10.6 — Polimento adicional (pre-Slack)
9. `AnswerPulseModal` e `AnswerPeerReviewModal`: `requestClose()` dispara confirm-toast "Sair sem enviar?" se já houver respostas com texto. Antes descartava silenciosamente. Padrão agora é consistente com os Wizards.
10. `SendPulseModal`: empty state "Você ainda não tem liderados diretos" agora é card inline visível imediatamente (antes ficava escondido dentro do dropdown). Quando vazio, esconde o resto do form e troca "Cancelar" por "Fechar".
11. Cleanup: removido cabeçalho de comentário duplicado em `SendPulseModal.tsx`.

## Garantias mantidas
- DB / RLS / triggers intactos.
- Toasts e invalidações de React Query consistentes em todos os submits.
- `disabled={submitting}` em todos os botões de submit + spinner `<Loader2/>`.
- Overlay close bloqueado durante submit em todos os modais.
- Rollback manual no `RequestPeerReviewModal` se peers insert falha (deleta review-pai órfã).
