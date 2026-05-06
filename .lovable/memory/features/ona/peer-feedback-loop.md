---
name: Peer Feedback Loop (continuous)
description: Sprint 15 — usa team_network_edges p/ pedir feedback curto a pares via Slack DM; resposta vira ctx_evidence (source_table=peer_feedback_requests) e entra no brief de 1:1 como bloco "Vozes de pares"
type: feature
---

## Objetivo
Continuous feedback leve, baseado em colaboração real (ONA), inspirado no Windy da Windmill.

## Schema
`peer_feedback_requests`: id, workspace_id, leader_user_id, subject_member_id, peer_user_id, peer_member_id, edge_strength_at_request, status (pending|answered|declined|expired), response_text, sent_at, responded_at, expires_at (default now()+14d).
- Sem unique parcial em tempo (Postgres não permite now() em índice). Anti-spam é feito na edge function.
- RLS: líder do subject lê; peer lê/atualiza só a própria; service_role total.
- Trigger `peer_feedback_to_evidence` (AFTER UPDATE): quando status vira 'answered' com response_text, insere `context_evidence` (source_table='peer_feedback_requests', evidence_type='peer_feedback', visibility='private_leader', tags=['peer_feedback'], metadata com peer_name + edge_strength).

## Edge function `request-peer-feedback` (cron 04:00 UTC)
- Lê `team_network_edges` window_days=30 com `weight_total >= 0.3`.
- Para cada par (a,b), tenta as duas direções (cada um pode ser subject e peer do outro).
- Skip se: peer não tem linked_user_id, peer não tem slack_integration, peer == leader do subject, ou já houve request para esse (subject, peer) nos últimos 14d.
- Limites: 5 requests por workspace por run, 50 totais por run.
- DM Slack: 2 botões — `peer_fb_open` (abre modal) e `peer_fb_skip` (declina).

## Slack handlers (`slack-bot/index.ts`)
- `peer_fb_open` (block_actions): abre modal `peer_feedback_submission` com private_metadata=request_id e textarea (10–1000 chars).
- `peer_fb_skip`: marca status='declined' e edita a mensagem original.
- `peer_feedback_submission` (view_submission): UPDATE status='answered' + response_text + responded_at, gated por peer_user_id=persona.userId. Trigger materializa ctx_evidence automaticamente.

## Brief (`briefGenerator.ts`)
Bloco "Vozes de pares recentes" (max 2, últimos 30d) injetado dentro de `networkContext`, antes do prompt final ao Gemini. Tom humano via wrapAsRhy() já aplicado no contexto agregado.

## Frontend
`src/components/context/sourceMeta.ts`: adicionado `peer_feedback_requests` → label "Feedback de par" com ícone Users e badge teal. Aparece automaticamente no `/lider/contexto` e no EvidenceDrawer/CitationChip.

## Cron
`request-peer-feedback-daily` 0 4 * * * — depois do build-team-graph (03:00) e detect-network-signals (03:30).
