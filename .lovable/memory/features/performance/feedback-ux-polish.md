---
name: Feedback Ecosystem UX Polish (Sprint 10.5)
description: Sanity check pós-Sprint 10.x — corrige guards de submit, invalidações, redireciona páginas Pulse fantasmas e corrige auto-scroll dos wizards
type: feature
---

Auditoria completa do "wiring" frontend dos módulos Pulse, Self/Peer/Upwards Review.

## Correções aplicadas
1. `/lider/pulse` e `/liderado/pulse` redirecionam para `/lider/contexto` e `/liderado` (eram páginas fantasmas).
2. `/liderado/avaliacoes` aba "Para revisar" deixou de renderizar `<Index/>` inteiro; agora aponta para o painel.
3. `AnswerPulseModal` e `SendPulseModal`: guarda `!submitting` no overlay close; SendPulse reseta estado on open.
4. `AnswerPeerReviewModal`: invalida `team-timeline` (peer reviews completas geram ctx_evidence — Sprint 10.1 trigger).
5. `RequestPeerReviewModal`: empty state inline para "sem liderados" (não escondido dentro do Select).
6. `SelfReviewWizard` + `UpwardsReviewWizard`: substituído `<ScrollArea>` por `<div overflow-y-auto>` (auto-scroll quebrava com ref no Radix root). Botão "Sair" mid-flow com confirmação via toast quando há respostas.
7. `useLeaderInfo`: lookup do nome do líder agora respeita `workspace_id` ativo (multi-tenant safety).
8. `DirectReportDashboard` seção "Avaliações Formais": ordem invertida — reviews do líder antes dos cards de iniciar self/upwards (consumir antes de produzir).

## Garantias mantidas
- DB / RLS / triggers intactos.
- Toasts e invalidações de React Query consistentes em todos os submits.
- `disabled={submitting}` em todos os botões de submit.
