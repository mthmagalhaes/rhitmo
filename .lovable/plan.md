# Rhitmo — Plano de Execução

> **Atualizado:** 13 de Maio de 2026
> **Sprint atual concluída:** Sprint 17 (Quarterly Anniversary Nudge + Formal Review RAG completo)
> **Próxima:** Sprint 18

Este arquivo é leve por design. Implementações fechadas vivem em `rhitmo-technical-report-april-2026.md` e nas memórias `mem://`.

---

## Status atual

- **Produto:** estável em produção (`https://rhitmo.co`).
- **Cobertura funcional:** Context Graph, Mentor (RAG 3 camadas), 1:1s, Reviews 360° completas (Self / Peer / Upwards / Formal com RAG), Pulse, Slack-native (DMs, slash, Assistant container, ambient), Recall.ai, Quarterly Recaps (auto + on-demand).
- **Arquitetura recente:** Safe Supabase Wrappers (frontend + edge), Edge Function Ownership Pattern, Slack Conversational State Machine, Slack DM RAG Temporal Windows, Network Signals & Pulse.

---

## Backlog priorizado (próximos 4-6 sprints)

| # | Iniciativa | Por quê |
|---|---|---|
| 1 | **Onboarding Self-Service v2** — fluxo guiado pós-signup com checklist persistente e nudges Slack | Reduzir time-to-first-value e ativação D1/D7 |
| 2 | **Pitch Seed materials** — pitch deck, demo flow, datasets para fundraising | Suporte ao roadmap de captação |
| 3 | **Continuous Feedback (Windmill-inspired)** — repensar menu Contexto com Windy-like chatbot + ONA-driven prompts | Aumentar densidade de evidências sem fricção |
| 4 | **Multi-language UX** — finalizar i18n PT/EN/ES nas Edge Functions (prompts, emails) | Pré-requisito para LatAm + US fundraising |
| 5 | **Enterprise hardening** — SSO/SAML completo, audit logs por workspace, data export | Habilitar pipeline Business → Enterprise |

---

## Tech debt visível

- **Schema discrepancy:** `member_id` é nullable no DB mas non-null nos types TS gerados. Manter awareness até refactor de tipos.
- **Migração `.catch()` → safe wrappers:** ~60% das chamadas migradas; resta varredura final em hooks legados.
- **Bias detection:** atualmente client-side ProseMirror. Avaliar mover para edge para uniformidade entre Slack/Tiptap.
- **Recall.ai cost:** monitorar quando uso ultrapassar 200 reuniões/dia; considerar cap por workspace.
- **Quarterly Recap cron:** depende de `x-cron-secret`; rotação trimestral ainda manual.

---

## Não-fazer agora (decisões registradas)

- Não implementar Continuous Feedback Windmill-style ainda (referência conceitual em `mem://product/continuous-feedback-windmill-reference`).
- Não renomear app Slack de "Rhitmo" para "Rhy".
- Não migrar billing para Lovable Native; manter Stripe Edge Functions custom.
