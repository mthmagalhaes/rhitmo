---
name: Impersonation View Mode
description: Como impersonate de admin funciona no front + DB. Regras leitura vs escrita autoral, RLS com effective_user_id, indicador discreto, expiração de 1h e auditoria.
type: feature
---

Super-admin (matheus@rhitmo.co) pode visualizar como qualquer usuário via tabela `admin_impersonation`. UX e regras:

## Frontend
- Hook `useEffectiveUser()` retorna `id` do impersonado (ou auth user normal).
- **Leitura de "meus dados"** → SEMPRE usar `useEffectiveUser().id`, nunca `useAuth().user.id`. Isso vale para `usePlanLimits`, `useCalendarIntegration`, `useUserRole`, `useLinkedMember`, dashboards, analytics, perfil, sidebar avatar, etc.
- **Escrita de auditoria/autoria** (manager_id, criado_por, from_user_id de kudos) → manter `useAuth().user.id`. O admin é o autor real e isso preserva accountability.
- **Checagem de "é admin?"** → SEMPRE usar `useAdmin()` (que usa `auth.uid()`), nunca `useEffectiveUser().email`. Caso contrário, features de admin (Design System, painel admin) vazam para o usuário impersonado.

## DB / RLS
- Função `effective_user_id()` (STABLE SECURITY DEFINER) lê `admin_impersonation` e cai em `auth.uid()` se não houver impersonate ativo. **Ignora registros expirados (`expires_at < now()`) e encerrados (`ended_at IS NOT NULL`)**.
- **Policies de leitura/update de "dados próprios" devem usar `effective_user_id()`**, não `auth.uid()`. Aplica-se a: feedbacks compartilhados, performance_reviews compartilhados, development_plans/items, goals, team_members (self via linked_user_id), user_preferences, slack_integrations, extension_tokens, recall_bots, leader_nudges, rhitmo_sync_notifications, bias_detections, kudos, feedback_streaks, pending_slack_invites.
- **NÃO mudar**: `admin_impersonation` (sempre `auth.uid()` real para evitar loop), `user_roles` (checagem de admin), policies de INSERT autoral (manter `auth.uid()` para registrar autor real).

## Hardening (4 camadas)
- **Expiração**: coluna `expires_at` default `now() + 1h`, máximo 4h enforced pela INSERT policy. Cron `cleanup-expired-impersonations` roda a cada 15min e DELETA expirados.
- **Anti-escalation**: função `is_admin_user(uuid)` impede admin de impersonar outro admin ou a si mesmo (checado no `WITH CHECK` da INSERT policy).
- **Auditoria**: tabela `admin_impersonation_audit` (append-only) recebe registro de cada start/stop/expired via trigger SECURITY DEFINER em `admin_impersonation`. Só admins leem. Sem policy de INSERT (apenas trigger bypassa).
- **Policies separadas por comando**: SELECT/INSERT/UPDATE/DELETE em vez de uma policy ALL única, para que o `WITH CHECK` da INSERT possa ter regras mais estritas que SELECT.

## UX
- Sem banner amarelo. Indicador discreto: `ImpersonationIndicator.tsx` envelopa o avatar com anel âmbar (`ring-amber-400`) + tag "Personificando" + tooltip. Click no anel/tag chama `stopImpersonation()`.
- Botão âmbar "Encerrar visualização" no footer do sidebar durante impersonate.
- Após start/stop: hard reload pra `AccountContext` re-resolver tudo.
