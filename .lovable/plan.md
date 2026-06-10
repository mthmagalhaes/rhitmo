## Objetivo

Transformar a aba "Liderados" do painel RH num **diretório único de pessoas do workspace** (Owner + HR Admins + Líderes + Liderados), com papéis como coluna/filtro — espelhando o padrão de `/admin` mas com escopo intra-workspace. `/admin` (super-admin Rhitmo, cross-workspace) permanece intocado.

## Princípios de não-quebra

1. **Aditivo primeiro, destrutivo por último.** Nova página coexiste com a antiga até validação.
2. **Reuso máximo.** `AdminUsers.tsx` é referência de UX, não de código — copiamos o padrão, não a tabela (escopo e RLS são diferentes).
3. **Zero mudança em `/admin`, `/lider/*`, `/liderado/*`.** Apenas `/hr/*` muda.
4. **RLS via RPC `SECURITY DEFINER`** com `workspace_id` fixado pelo guard — sem expor políticas novas em tabelas existentes.
5. **Convites continuam usando as 3 edge functions existentes** (`admin-invite-user`, `invite-hr-admin`, `bulk-onboard`/`admin-invite-user` p/ líder) — só muda o ponto de entrada.

## Faseamento

### Fase 1 — Backend (RPC + nada destrutivo)

**Nova RPC `get_workspace_people(p_workspace_id uuid)`** — `SECURITY DEFINER`, valida que `auth.uid()` é Owner ou HR Admin do workspace antes de retornar. Retorna 1 row por pessoa com:

- `user_id`, `full_name`, `email`, `avatar_url`
- `roles[]` agregado: `owner` | `hr_admin` | `leader` | `member` (uma pessoa pode ter várias)
- `team_id`, `team_name` (do `team_members` quando aplicável; primeiro time se múltiplos)
- `leader_user_id`, `leader_name` (do `teams.leader_user_id`)
- `status`: `active` | `pending_invite` | `unlinked` (placeholder)
- `last_activity_at` (max de last_sign_in / last feedback / last meeting)
- `created_at` do vínculo mais antigo

Fontes agregadas em UNION:
- `workspaces.owner_id` → role `owner`
- `unnest(workspaces.hr_admin_ids)` → role `hr_admin`
- `teams.leader_user_id` (DISTINCT) → role `leader`
- `team_members.linked_user_id` (where `workspace_id=p_workspace_id`) → role `member`
- `team_members` sem `linked_user_id` mas com `pending_email` → status `pending_invite`

Sem novas tabelas. Sem novas policies em tabelas existentes.

### Fase 2 — Frontend (nova página, antiga preservada)

**Nova rota `/hr/pessoas`** apontando para `src/pages/HRPessoas.tsx` (nova). `HRMembers.tsx` permanece acessível em `/hr/members` durante a transição (link no sidebar HR passa a apontar para `/hr/pessoas`, mas a rota antiga responde).

**`HRPessoas.tsx`** — segue padrão visual de `AdminUsers.tsx` (memo `admin/management-tools`) mas adaptado ao workspace:

- Header com 5 filtros: busca (nome/email), **papel** (multi: Owner/HR/Líder/Liderado/Sem líder), **time**, **líder**, **status** (Ativo/Convite pendente).
- Segmentos clicáveis acima da tabela: `Todos · Liderados · Líderes · HR · Sem líder · Convites pendentes`.
- Botão primário **"Convidar"** (split-button): Liderado / Líder / HR Admin → abre os 3 dialogs/wizards existentes.
- Colunas: Pessoa (avatar+nome+email) · Time · Líder · **Papéis** (chips coloridos seguindo memo `papeis-e-permissoes`) · Status · Última atividade · Ações.
- Row click → reaproveita `MemberAdminSheet` quando a pessoa é Liderado; para Líder/HR, sheet leve com dados do workspace (sem campos comportamentais — esses são só de Liderado).
- Export CSV reusa `src/lib/csvExport.ts`.

**Sidebar HR** (`AppSidebar.tsx`, seção HR): item "Liderados" vira **"Pessoas"** apontando para `/hr/pessoas`. `/hr/teams` permanece como complemento estrutural.

### Fase 3 — Migração e cleanup

Após 1–2 semanas de uso validado:
- `/hr/members` redireciona para `/hr/pessoas`.
- `HRMembers.tsx` removido (manter PR separado para reverter rápido se necessário).

## Detalhes técnicos

### RPC (sketch)

```sql
CREATE OR REPLACE FUNCTION public.get_workspace_people(p_workspace_id uuid)
RETURNS TABLE (
  user_id uuid, full_name text, email text, avatar_url text,
  roles text[], team_id uuid, team_name text,
  leader_user_id uuid, leader_name text,
  status text, last_activity_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM workspaces w
            WHERE w.id = p_workspace_id
              AND (w.owner_id = auth.uid()
                   OR auth.uid() = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))))
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- UNION das 4 fontes + agregação por user_id ...
END $$;

GRANT EXECUTE ON FUNCTION public.get_workspace_people(uuid) TO authenticated;
```

### Componentes novos / alterados

- `src/pages/HRPessoas.tsx` (novo) — página principal.
- `src/components/hr/PeopleTable.tsx` (novo) — tabela com filtros/segmentos.
- `src/components/hr/InvitePersonMenu.tsx` (novo) — split-button reusando dialogs existentes.
- `src/hooks/useWorkspacePeople.ts` (novo) — wrapper do `safeRpc('get_workspace_people')`.
- `src/components/AppSidebar.tsx` — rótulo "Liderados" → "Pessoas", `to="/hr/pessoas"`.
- `src/App.tsx` — registrar rota `/hr/pessoas` (mantendo `/hr/members`).

### Não muda

- `/admin` e tudo em `src/components/admin/*`.
- RLS de `team_members`, `workspaces`, `teams`, `feedbacks`, etc.
- `HRAdminGuard` (já permite Owner + HR).
- `AccountContext` / `useUserRole` / `useEffectiveUser`.
- Edge functions de convite.

### Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Vazamento cross-workspace | RPC `SECURITY DEFINER` valida Owner/HR antes de qualquer SELECT; `workspace_id` vem do guard, não do client. |
| Duplicação de pessoa com múltiplos papéis | Agregação por `user_id` no RPC; `roles[]` como array. |
| Líder em vários times | Mostrar primeiro time + chip "+N times"; sheet detalha. |
| Performance em workspace grande | RPC com `LIMIT/OFFSET` no client (paginação ou virtualização); índices já existentes em `team_members.workspace_id` e `teams.workspace_id`. |
| Quebrar bookmarks de `/hr/members` | Rota antiga preservada com redirect na Fase 3. |

## Verificação por fase

- **Fase 1:** chamar RPC como Owner, HR Admin, Líder puro, Liderado puro → só Owner/HR retornam dados; cross-workspace bloqueado.
- **Fase 2:** abrir `/hr/pessoas` com cada papel — Owner/HR veem; Líder puro/Liderado são bloqueados pelo `HRAdminGuard` existente. Convites criam linhas corretas. CSV exporta filtrado.
- **Fase 3:** `/hr/members` redireciona; sem regressão no `/admin` nem no `/lider/*`.

## Fora de escopo desta entrega

- Mudar política de "Owner enxerga tudo" em `/lider/*` (já existe e funciona).
- Billing / segmentos comerciais (são de `/admin`, não de `/hr`).
- Impersonation (só super-admin).
- Edição inline de papéis na tabela — Fase 4 futura.
