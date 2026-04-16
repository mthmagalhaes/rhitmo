---
name: Impersonation View Mode
description: Como impersonate de admin funciona no front + DB. Regras leitura vs escrita autoral, RLS com effective_user_id, indicador discreto.
type: feature
---

Super-admin (matheus@rhitmo.co) pode visualizar como qualquer usuário via tabela `admin_impersonation`. UX e regras:

## Frontend
- Hook `useEffectiveUser()` retorna `id` do impersonado (ou auth user normal).
- **Leitura de "meus dados"** → SEMPRE usar `useEffectiveUser().id`, nunca `useAuth().user.id`. Isso vale para `usePlanLimits`, `useCalendarIntegration`, `useUserRole`, `useLinkedMember`, dashboards, analytics, perfil, sidebar avatar, etc.
- **Escrita de auditoria/autoria** (manager_id, criado_por, from_user_id de kudos) → manter `useAuth().user.id`. O admin é o autor real e isso preserva accountability.

## DB / RLS
- Função `effective_user_id()` (STABLE SECURITY DEFINER) lê `admin_impersonation` e cai em `auth.uid()` se não houver impersonate.
- **Policies de leitura/update de "dados próprios" devem usar `effective_user_id()`**, não `auth.uid()`. Aplica-se a: feedbacks compartilhados, performance_reviews compartilhados, development_plans/items, goals, team_members (self via linked_user_id), user_preferences, slack_integrations, extension_tokens, recall_bots, leader_nudges, rhitmo_sync_notifications, bias_detections, kudos, feedback_streaks, pending_slack_invites.
- **NÃO mudar**: `admin_impersonation` (sempre `auth.uid()` real para evitar loop), `user_roles` (checagem de admin), policies de INSERT autoral (manter `auth.uid()` para registrar autor real).

## UX
- Sem banner amarelo. Indicador discreto: `ImpersonationIndicator.tsx` envelopa o avatar com anel âmbar (`ring-amber-400`) + tag "Personificando" + tooltip. Click no anel/tag chama `stopImpersonation()`.
- Após start/stop: hard reload pra `AccountContext` re-resolver tudo.
