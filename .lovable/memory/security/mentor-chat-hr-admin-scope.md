---
name: Mentor Chat — escopo HR Admin
description: Auditoria confirma que Mentor Chat é seguro para HR Admin — não vaza dados entre times do workspace
type: feature
---

Auditoria de `supabase/functions/chat-mentor/index.ts` em 22/05/2026 (Sprint HR Admin Faster Ops):

- **`mode = 'leader_self'`**: função confia em `auth.uid()` (linha 482) e busca contexto via `teams.leader_user_id = leaderUserId`. HR Admin que **não é** `leader_user_id` de nenhum time recebe contexto vazio — não há leak.
- **`mode = 'member'`**: função recebe `feedbacks[]` do cliente. Como o cliente lê via RLS de `feedbacks` (`manager_id = auth.uid()` OR `is_workspace_owner_of_member(member_id)`), HR Admin que não é manager nem owner não consegue carregar feedbacks de liderados de outros líderes. Mesmo se passar `memberName`/`memberRole`, sem `feedbacks` reais o prompt fica sem conteúdo útil.

**Conclusão:** Mentor Chat é workspace-safe para HR Admin sem nenhuma mudança. O HR Admin só consegue conversar sobre dados que ele já tem acesso por RLS (= nada além do que ele mesmo lidera).

**Se um dia HR Admin precisar perguntar sobre o workspace inteiro**, criar um modo dedicado `hr_admin_overview` no chat-mentor que valide `is_hr_admin_of_workspace(auth.uid(), workspace_id)` e use service_role para agregar — nunca expor `mode='member'` para times alheios.
