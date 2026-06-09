# Plano de correções — Tickets do Guto (Faster)

Ordem otimizada por impacto × risco. Ticket #5 (tela branca) fica fora — aguarda evidências.

---

## Ticket #1 — `/hr/liderados` vazio (CRÍTICO)

**Causa:** RPC `get_hr_all_members` chama `jsonb_array_length(skills_data)`, mas no workspace da Faster há linhas onde `skills_data` é objeto `{}` (não array), o que estoura exceção e devolve set vazio.

**Fix:** Migration que recria `get_hr_all_members` envolvendo o cálculo com guarda de tipo:
```sql
CASE WHEN jsonb_typeof(tm.skills_data) = 'array'
     THEN jsonb_array_length(tm.skills_data) > 0
     ELSE false END AS has_skills_map
```
Mesma guarda em qualquer outro `jsonb_array_length` da função.

**Validação:** rodar a RPC com `_workspace_id` da Faster e confirmar retorno > 0; abrir `/hr/liderados` logado como Guto.

---

## Ticket #2 — Slack "No workspace found" para HR Admin / Líder

**Causa:** `slack-link/index.ts` resolve workspace só por `workspaces.owner_id` ou `team_members.linked_user_id`. Guto é HR Admin e Líder — nenhum dos dois.

**Fix em `supabase/functions/slack-link/index.ts`:**
1. Após tentar Owner, tentar `workspaces.hr_admin_ids @> [user_id]`.
2. Se nada, tentar `teams.leader_user_id = user_id` → pega `workspace_id` do team.
3. Manter fallback atual (`linked_user_id`) por último.
4. Log claro de qual caminho resolveu (para debug futuro).

**Validação:** curl edge function com auth do Guto + `supabase--edge_function_logs`.

---

## Ticket #4 — HR Admin não consegue disparar convites em massa

**Causa:** `dispatch-bulk-invites` exige `check_is_admin` (super admin). Tela `/hr/liderados` também não tem botão.

**Fix em duas partes:**

**4A · Edge function** (`dispatch-bulk-invites/index.ts`):
- Trocar gate `check_is_admin` por: super admin **OU** (HR Admin/Owner do `workspace_id` recebido).
- Validar via `is_hr_admin_of_workspace(user_id, workspace_id)` ou checagem direta em `workspaces` (`owner_id` / `hr_admin_ids`).

**4B · UI** (`src/pages/HRMembers.tsx`):
- Adicionar botão "Disparar convites pendentes" no header, ao lado de "Importar em massa".
- Dialog de confirmação mostrando `dry_run` (lista de pendentes) → botão "Enviar agora".
- Feedback de sucesso/erro com summary (`sent`, `errors`).

**Validação:** dry_run + envio real em 1 pendente do workspace da Faster.

---

## Ticket #3 — DMs duplicadas / reuniões de grupo viram 1:1

**Causa:** `fetch-calendar-events` classifica como 1:1 qualquer evento com ≥1 membro presente nos attendees. Em reuniões de grupo (3+ pessoas) e em casos onde um liderado tem múltiplos `team_members` (ex. Camila com record duplicado), gera múltiplos `upcoming_meetings` → múltiplas DMs.

**Fix em `supabase/functions/fetch-calendar-events/index.ts`:**
1. Contar attendees externos (excluindo o próprio líder + recursos `resource.calendar.google.com`).
2. Só inserir em `upcoming_meetings` quando: `attendee_count ≤ 3` **E** exatamente 1 `team_member` matched (deduplicar por `linked_user_id` antes do match).
3. Dedup por `(event_id, leader_user_id)` no upsert (constraint já existe? confirmar antes da migration).
4. Log explícito quando descartar evento de grupo.

**Acompanhamento (sem código novo):** orientar Guto a deduplicar o record da Camila em `/hr/liderados`.

**Validação:** rodar manualmente para o user_id do Guto, conferir `upcoming_meetings` antes/depois.

---

## Ordem de execução proposta

1. Ticket #1 (migration única, desbloqueia HR view)
2. Ticket #2 (edge function, isolado)
3. Ticket #4A + #4B (edge + UI, fecha loop de onboarding HR)
4. Ticket #3 (edge function, mais sensível — testar com dry-run)

Cada ticket é commit/migration independente. Posso aplicar tudo em sequência ou pausar para você validar entre eles.

## Fora deste plano

- **Ticket #5 (tela branca no convite):** aguardando console + URL exata do Guto.
- **URL "normal" aparecendo após republicar:** assunto separado, conforme você confirmou.
