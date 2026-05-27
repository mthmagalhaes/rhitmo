## Diagnóstico

Quando Matheus (Owner de Faster Ops, mas **não** está em `hr_admin_ids`) entra em `/hr/*`, dois problemas se somam:

1. **Backend rejeita o Owner.** As 6 RPCs `get_hr_*` (`get_hr_dashboard_metrics`, `get_hr_leaders_overview`, `get_hr_leader_team`, `get_hr_all_members`, `get_hr_member_profile`, `get_hr_analytics_advanced`) só autorizam `is_admin() OR is_hr_admin_of_workspace(_id)`. Owner cai no `RAISE EXCEPTION 'Não autorizado'` → React Query devolve vazio → `/hr` mostra 0%, `/hr/teams` mostra "Nenhum líder cadastrado", `/hr/analytics` mostra zerado, `/hr/members` vazio.

2. **Sidebar não troca para HR nav.** `resolvePersona` retorna `'leader'` para o Owner (mesmo quando ele é HR Admin), então em `/hr/*` o usuário continua vendo `LEADER_NAV_ITEMS` (Início/Pessoas/Diário/Objetivos/Avaliações) e nunca enxerga as abas Times / Analytics / Pessoas do workspace.

3. **Dropdown do workspace** tem só "Visão do workspace" — sem atalho direto para Times.

## O que muda

### Backend — 1 migration

Centralizar a autorização num único helper e usar nas 6 RPCs:

```sql
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN public.is_admin()
      OR public.is_hr_admin_of_workspace(_workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = _workspace_id
          AND owner_id = public.effective_user_id()
          AND is_active = true
      );
END $$;
```

Substituir o bloco de guard `IF NOT (is_admin() OR is_hr_admin_of_workspace(_workspace_id))` por `IF NOT is_workspace_admin(_workspace_id)` nas 6 RPCs HR. Comportamento para HR Admin e super-admin permanece idêntico.

### Frontend — 2 arquivos

**`src/components/AppSidebar.tsx`** — quando a rota começa com `/hr`, forçar `HR_ADMIN_NAV_ITEMS` no menu (mesmo para persona `leader`). Isso dá ao Owner acesso direto a Visão Geral / Pessoas / **Times** / Analytics / Framework de competências enquanto ele estiver no contexto de workspace. Sair de `/hr` volta automaticamente ao menu de líder.

**`src/components/sidebar/WorkspaceSwitcher.tsx`** — abaixo de "Visão do workspace", para Owner/HR Admin, adicionar atalhos diretos: **Times** (`/hr/teams`), **Pessoas do workspace** (`/hr/members`) e **Analytics** (`/hr/analytics`). Itens existentes (Settings, Help, Refazer tour, Adicionar liderado) permanecem.

## Não muda

- Rotas `/workspace/*` continuam redirecionando para `/hr/*` (compat).
- RLS das tabelas e regras de leader-scope em `/lider/*` (já corrigidas no sprint anterior).
- `/hr/competency-framework` continua acessível normalmente.
- Comportamento para o HR Admin puro (`isHRAdmin && !isWorkspaceOwner`) — já funcionava, segue igual.

## Verificação após implementar

1. `psql` → `SELECT public.is_workspace_admin('27ee8977-d538-482f-a9a7-7a4363b89e5e')` impersonando Matheus deve retornar `true`.
2. `/hr` mostra cobertura, PDI, risco com números reais de Faster Ops.
3. `/hr/teams` lista 6 líderes (Matheus + Vitor + Douglas + outros 3 com `leader_user_id`).
4. Sidebar em `/hr/*` mostra Visão Geral / Pessoas / Times / Analytics / Framework.
5. Dropdown do workspace tem entrada "Times" visível.
