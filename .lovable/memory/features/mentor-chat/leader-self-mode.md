---
name: Mentor Chat — Modo Coaching Pessoal + RAG ampliado
description: Quando thread não tem member_id, edge function chat-mentor recebe mode='leader_self' e usa rhitmo-leader-coach prompt com leader_sync_data + padrões agregados do time. Modo member ganhou RAG sobre context_evidence (RPC match_context_evidence) + threshold 0.35/top 25 + janela adaptativa (compressContextLarge: 80 notas / 40k chars) quando RAG retorna ≥15 hits.
type: feature
---

## Modo Coaching Pessoal (`mode='leader_self'`)
- Trigger: `isLeader && !memberId` no MentorChat (frontend) → body inclui `mode`, `leaderUserId`, `leaderName`.
- Backend pula validação `memberName/feedbacks`, pula router/RAG, e usa `buildLeaderCoachSystemPrompt` (`_shared/rhitmo-leader-coach.ts`).
- Contexto agregado: directReports list + últimas 40 `context_evidence` (agrupadas por type/sentiment/tags) + 3 `weekly_reflection` recentes do líder.
- Guardrail: se pergunta for sobre liderado específico, redireciona para "Trocar contexto".

## RAG ampliado (modo member)
- `match_feedbacks`: threshold 0.5→0.35, count 10→25.
- Novo `match_context_evidence` (mesma assinatura) puxa Context Graph (meetings/pulses/reviews/slack já com summary curado).
- Janela adaptativa: ≥15 hits semânticos → `compressContextLarge` (80 notas, 40k chars, truncate 1500ch). Padrão continua 50/20k/800ch.
- Log `evidence_breakdown: { from_recent, from_semantic_feedbacks, from_semantic_evidence }` para debugging.
