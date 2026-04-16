

## Correções no Painel Admin — Tags duplicadas + Ordenação/Filtro

### 1. Deduplicar badges de papel por workspace

**Problema:** `get_user_caps` RPC retorna um registro por **time**, mas os badges mostram `Líder @ {workspace_name}` — resultando em 9 badges idênticos para quem lidera 9 times no mesmo workspace.

**Fix em `renderCapBadges` (AdminUsers.tsx):**
- Agrupar `leader_of` por `workspace_name`, exibir apenas 1 badge por workspace com contagem: `Líder @ Rhitmo Inc. (9 times)`
- Agrupar `member_of` da mesma forma: `Liderado @ Faster Ops`
- `owner_of` e `hr_admin_of` já são por workspace, não precisam de dedup
- Se o usuário tiver apenas 1 time no workspace, não mostrar contagem

### 2. Adicionar ordenação e filtros na tabela de usuários

**Melhorias em AdminUsers.tsx:**
- Adicionar **sort** clicável nos headers da tabela (Nome, Email, Status)
- Estado: `sortField` (`name` | `email` | `status`) + `sortDirection` (`asc` | `desc`)
- Ícone `ArrowUpDown` nos headers clicáveis
- Manter filtro por papel e busca já existentes
- Adicionar filtro por **status** (Ativo / Suspenso / Sem workspace) como terceiro dropdown

### Arquivos modificados
- `src/components/admin/AdminUsers.tsx` (dedup badges + sort headers + status filter)

