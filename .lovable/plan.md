## Contexto

A nova `/hr/pessoas` ganhou a visão unificada (Owner/HR/Líder/Liderado) mas perdeu 3 coisas que existiam em `/hr/members`:

1. **Status Rhitmo Sync** ("Sync pendente" vs feito) por pessoa.
2. **Status de vínculo** ("Vinculado" vs "Convite pendente") — hoje só temos `status`, sem distinguir liderado **convidado e não logado** de liderado **vinculado a um user**.
3. **Coluna Ações** (`Ver` + `⋯` com Editar, Mover de time, Reenviar convite, Reenviar Sync, Remover). Inclua a opção reset de senha que só tem hoje para Super admin

Avaliação rápida (PM + UX + Cofounder):

- **PM:** sem ações inline a página vira read-only, e RH perde o trabalho diário (mexer em time/liderança, cobrar Sync). Bloqueador.
- **UX:** padrão correto é coluna "Ações" à direita + clique na linha abre **Sheet lateral** (mesmo padrão Linear/Notion). Reaproveitar `MemberAdminSheet` que já existe e a memória `member-admin-sheet-rhitmo-sync` documenta — evita refazer Sync UI.
- **Cofounder técnico:** só precisamos expandir 2 colunas no RPC `get_workspace_people` (`has_sync`, `is_linked`) e plugar componentes já existentes (`MemberAdminSheet`, `EditMemberDialog`). Sem nova tabela, sem nova edge function.

Importante: ações de **Líder/HR/Owner** são diferentes das de **Liderado** (não dá pra "mover de time" um Owner). Vamos diferenciar por papel.

---

## Plano

### Fase 1 — Backend (1 migration, aditiva)

Atualizar `public.get_workspace_people(p_workspace_id)` para retornar 2 colunas novas:

- `has_sync boolean` — `team_members.skills_data IS NOT NULL OR job_crafting_profile IS NOT NULL` (mesma regra usada hoje em `/hr/members`).
- `is_linked boolean` — `team_members.linked_user_id IS NOT NULL`.

Nenhuma policy/grant novo. Atualizar `WorkspacePerson` em `useWorkspacePeople.ts`.

### Fase 2 — UI: novas colunas de status

Em `HRPessoas.tsx`:

- Coluna **Status** passa a mostrar 2 chips empilhados para liderados:
  - Vínculo: `Vinculado` (emerald) / `Convite pendente` (amber) / `Não vinculado` (slate, quando criado sem email).
  - Sync: `Sync ✓` (emerald sutil) / `Sync pendente` (amber sutil).
  - Para Owner/HR/Líder puros: só o chip `Ativo` (como hoje).
- Nova métrica no segmento: contador "Sync pendente" (clicável) ao lado de "Convites pendentes".

### Fase 3 — Coluna "Ações" + Sheet lateral

Adicionar coluna final `Ações` com:

- **Clique na linha** (qualquer célula exceto a coluna ações) → abre Sheet lateral.
  - Se a pessoa tem `member_id` (é liderado) → reaproveita `MemberAdminSheet` existente (já tem Rhitmo Sync, reenviar pesquisa, perfil).
  - Se é só Líder/HR/Owner sem `member_id` → Sheet leve novo (`WorkspacePersonSheet`) com: nome, e-mail, papéis, workspaces, botão "Editar nome/e-mail" (reusa `admin-update-user`), "Remover papel HR" (quando aplicável).
- **Botão `⋯**` (DropdownMenu) na própria linha, com itens contextuais ao papel:
  - Liderado: Ver perfil · Editar (nome/time/cargo) · Mover de time · Transferir liderança · Reenviar convite (se pendente) · Reenviar Rhitmo Sync (se `!has_sync`) · Remover.
  - Líder: Ver perfil · Editar nome/e-mail · Remover papel de líder (se também é liderado, mantém o cadastro).
  - HR Admin: Ver perfil · Remover papel HR (não permite remover o último HR/Owner — guarda).
  - Owner: Ver perfil (só leitura; transferir Owner fica fora de escopo, já existe em outro lugar).

Reaproveitar componentes existentes:

- `EditMemberDialog` para editar liderado (nome, time, cargo).
- `admin-update-user` edge function para editar nome/e-mail de qualquer usuário.
- `invite-hr-admin` com `action: 'revoke'` para remover papel HR.
- Lógica de remover liderado e reenviar Sync já existe em `useResendRhitmoSync` e no padrão de `HRMembers.tsx` (copiar `handleDelete` + `handleResendSyncOne`).

### Fase 4 — Limpeza visual

- "Mover de time" e "Transferir liderança" abrem o mesmo `EditMemberDialog` (já suporta `team_id` e troca de líder via `leader_user_id` no time-pai? — confirmar; se não suportar troca de líder direto, abrir submenu com select de líderes do workspace e gravar via `team_members.leader_override` ou trocar `team_id` para um time do novo líder; manter comportamento idêntico ao `/hr/members` atual).
- Manter o card Bento/`rounded-2xl`, sem regressão visual.

---

## Detalhes técnicos

**Arquivos a criar:**

- `src/components/hr/WorkspacePersonSheet.tsx` — sheet leve p/ Líder/HR/Owner.
- `supabase/migrations/<ts>_get_workspace_people_v2.sql` — atualiza a função (CREATE OR REPLACE).

**Arquivos a editar:**

- `src/hooks/useWorkspacePeople.ts` — adicionar `has_sync`, `is_linked`.
- `src/pages/HRPessoas.tsx` — coluna Status nova, coluna Ações, DropdownMenu, integração com `MemberAdminSheet`, `EditMemberDialog`, confirm dialogs.

**Sem mexer em:** `/admin`, `/hr/members` (mantém redirect), `MemberAdminSheet.tsx`, edge functions, RLS, `AccountContext`.

**Riscos / guardas:**

- Não permitir remover o último HR Admin nem o Owner do workspace (validação client + a edge `invite-hr-admin` já valida server-side).
- Para pessoas com múltiplos papéis (ex.: Líder + Liderado), o menu mostra ações dos dois papéis numa única lista com separadores.
- Performance: a coluna Sync já vem do RPC, então não há N+1.

**Tente incluir (ou se ficar muito grande com risco de quebrar, fazemos na próxima sprint):**

- Edição inline de papéis (promover Liderado→HR direto da tabela).
- Transferência de Owner.
- Bulk actions (checkbox + ações em massa) — a barra de seleção pode entrar numa Fase 5 se você quiser repetir o padrão do `/admin`.