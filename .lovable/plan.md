

## Plano: Aba Usuários do Admin como Data Analyst

### Diagnóstico

Tabela atual tem 4 colunas: Usuário, Papéis, Status, Ações. Sem ID visível, sem Cliente, sem Workspace explícito (só dentro dos badges). Filtros: busca por nome/email, papel, status. Falta: filtros por coluna nova + edição de Cliente/Workspace.

`workspaces` não tem campo "Cliente". Vou adicionar 2 campos no schema (úteis pra Data Analyst):
- `client_account` (text, livre — ex: "FSTR Holding", "Fictícios LTDA")
- `customer_segment` (enum: `beta`, `paid`, `trial`, `internal`, `test`)

### Schema (migration)

```sql
ALTER TABLE workspaces 
  ADD COLUMN client_account text,
  ADD COLUMN customer_segment text DEFAULT 'beta' 
    CHECK (customer_segment IN ('beta','paid','trial','internal','test'));

-- Pré-popular: workspaces de matheus@rhitmo.co e matheus_hr@rhitmo.co como 'internal'
-- demais workspaces ficam 'beta' (default)
```

### UI: novas colunas na tabela

| Coluna | Conteúdo | Filtro |
|---|---|---|
| Usuário | avatar + nome + email (já existe) | busca texto (já existe) |
| **ID** | UUID truncado `a1b2c3d4…` + botão copy-to-clipboard | busca por ID na busca global |
| **Workspace(s)** | nome(s) do(s) workspace(s) onde é Owner/HR/Líder/Liderado, com ícone do papel | dropdown filtrar por workspace |
| **Cliente** | `client_account` do workspace primário (ou “—”) + chip do `customer_segment` colorido | dropdown filtrar por segmento |
| Papéis | badges (já existe) | dropdown (já existe) |
| Status | Ativo/Suspenso (já existe) | dropdown (já existe) |
| Ações | botões (já existe) | — |

**Busca global**: estender pra buscar em `email`, `name`, `user_id`, `client_account`, `workspace.name`.

**Header de filtros refatorado**: substituir os 2 selects atuais por uma barra com 5 filtros (busca + papel + status + workspace + segmento), todos pequenos e alinhados.

### Edição (modal por usuário)

Adicionar botão `Edit` nas Ações que abre dialog com:
- **ID** (read-only, com botão copiar)
- **Nome completo** (editável → atualiza `auth.users.user_metadata.full_name` via edge function `admin-update-user`)
- **Email** (editável via edge function `admin-update-user` → `auth.admin.updateUserById`)
- **Workspace primário** — Select dos workspaces onde o user tem alguma relação. Permite trocar `owner_id` (transfer ownership) ou trocar `team_id` se for membro
- **Cliente (label livre)** — input texto, salva em `workspaces.client_account` do workspace primário
- **Segmento** — select (Beta/Paid/Trial/Interno/Teste), salva em `workspaces.customer_segment`

### Edge function nova (necessária)

`admin-update-user` (Deno, `verify_jwt=false` mas valida `is_admin()`):
- input: `{ user_id, full_name?, email? }`
- usa `supabase.auth.admin.updateUserById()` (service role)
- retorna sucesso/erro

Edição de `client_account`/`customer_segment` não precisa de edge function — admin tem RLS pra `workspaces`.

### Auditoria & Data Analyst extras

- **Export CSV** — botão "Exportar CSV" no topo da tabela exportando o que tá filtrado (nome, email, id, workspace, cliente, segmento, papéis, status). Ajuda Data Analyst.
- **Counter por segmento** — pequena linha de stats no topo: `Beta: 12 · Paid: 3 · Internal: 2 · Test: 4` (clique filtra)

### Memory

- Atualizar `mem://admin/management-tools` com: novos campos `client_account`/`customer_segment`, edge function `admin-update-user`, export CSV.

### Arquivos modificados

- `supabase/migrations/...sql` — ADD columns + seed dados internos
- `supabase/functions/admin-update-user/index.ts` (novo) — atualizar full_name/email
- `src/components/admin/AdminUsers.tsx` — refatorar header + 3 colunas novas + dialog de edição expandido + export CSV
- `mem://admin/management-tools` — atualizar

### Escopo

Médio. ~30 min. 1 migration leve, 1 edge function nova pequena, refactor de 1 componente. Sem risco arquitetural.

### Validação pós-fix

1. Tabela mostra ID (truncado, copiável), Workspace, Cliente (label + segmento)
2. Filtros: busca por UUID parcial funciona; dropdown de Workspace e Segmento filtram
3. Editar usuário: trocar nome, email, label de Cliente e Segmento — persistem
4. Stats no topo somam segmentos corretamente
5. Export CSV baixa arquivo com colunas certas

