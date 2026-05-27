## Diagnóstico

O Guto é HR Admin do workspace, **não é líder** dos times "Comercial" / "Produto/Tech". A RLS atual de escrita em `team_members` e `teams` só libera:

```
leader_user_id = effective_user_id()  OR  workspace.owner_id = effective_user_id()
```

HR Admin (`hr_admin_ids`) **não está na lista** — por isso:
- `INSERT team_members` → `new row violates row-level security policy` (erro do print).
- `UPDATE teams.leader_user_id` (trocar liderança) → silenciosamente bloqueado.
- Mover liderado entre times (`UPDATE team_members.team_id`) → mesmo bloqueio.

Curiosamente o caminho de **leitura** já inclui `hr_admin_ids` (`rls_check_member_read_access` / `rls_check_team_read_access`), por isso ele vê os times mas não consegue agir. É um bug clássico de paridade read↔write.

## Mudanças

### 1. Migração — paridade HR Admin nas funções de escrita
Atualizar duas funções `SECURITY DEFINER` para incluir HR Admin (e manter Super Admin via `is_admin()` já coberto pela policy `*_admin`):

- `public.rls_check_member_access(_member_team_id)` — usada em INSERT/UPDATE/DELETE de `team_members`.
- `public.rls_check_team_access(_team_id)` — usada em UPDATE/DELETE de `teams`.

Adicionar cláusula:
```
OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
```

Nada muda em RLS de leitura (já estava ok) nem em outras policies. Sem `GRANT` novo (tabelas já têm).

### 2. UI — Central de gestão para HR Admin em `/lider/pessoas`
A página já tem tudo que precisamos, só falta deixar o HR Admin enxergar/usar:

- **Trocar líder de um time**: `EditTeamDialog` já tem `LeaderPicker` gated por `isHRAdmin || isWorkspaceOwner` ✅ — vai funcionar assim que a RLS for corrigida.
- **Mover liderado entre times**: já existe ação bulk (`UPDATE team_members.team_id` em `Pessoas.tsx:264`). Vou:
  - Adicionar ação **"Mover para outro time"** também na linha individual do liderado (menu kebab da `MembersList`), além da bulk que já existe.
  - Adicionar ação **"Editar liderado"** (nome, cargo, e-mail) na mesma linha — usa o `MemberAdminSheet` que já existe.
- **Cadastrar liderado em qualquer time**: o `NewMemberDialog` já permite escolher o time pelo dropdown — depois do fix RLS, o insert passa.

### 3. Sem mudanças em
- `admin-invite-user` edge function (já tratado em sprint anterior).
- Schemas, GRANTs, outras tabelas.
- Fluxo do líder comum (continua restrito a seus times).

## Validação
1. Guto (HR Admin) abre `/lider/pessoas` → "Convidar liderado" → escolhe time "Comercial" → cria sem erro de RLS.
2. Aba **Times** → "Editar" no time Comercial → troca líder de Matheus → Douglas → salva.
3. Linha do liderado → menu **"Mover para outro time"** → escolhe novo time → atualiza.
4. Líder comum (não HR) continua só conseguindo mexer no próprio time.

## Fora de escopo
- Repensar permissões de Owner/Super Admin (já cobertos).
- Bulk de planilha, wizard de setup.
- Notificações para o liderado quando muda de time (pode virar próximo sprint).
