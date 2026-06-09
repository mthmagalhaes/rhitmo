# Fix — Matheus/Vitor não veem "Minha equipe" no switcher

## Causa raiz

Bug em `useActiveMode` combinado com semântica do RPC `get_account_context`:

1. **RPC `get_account_context`** calcula `v_is_leader` (= o usuário lidera algum time) mas **não retorna esse flag no JSON**. Só retorna `role` (string única) e `is_workspace_owner`. Quando o usuário é HR Admin, `role='hr_admin'` ofusca o fato de ele também liderar um time.

2. **`AccountContext`** deriva `isLeader = role==='leader' || role==='hr_admin'` — ou seja, todo HR Admin marca `isLeader=true`, mesmo HR puro sem time.

3. **`useActiveMode`** usa `pureHRAdmin = isHRAdmin && !isWorkspaceOwner` pra tentar excluir HR puro. **Falha** para o caso real do Matheus na Faster:
   - Guto é Owner da Faster (não o Matheus).
   - Matheus está em `hr_admin_ids` e lidera o time de Operações.
   - RPC retorna: `role='hr_admin'`, `is_workspace_owner=false`.
   - Resultado em useActiveMode: `pureHRAdmin=true`, `canSeeLeader=false`. ❌ Switcher esconde "Minha equipe".

O mesmo acontece com qualquer Owner que não esteja em `hr_admin_ids` mas seja HR de outra empresa, ou HR que também lidera time sem ser owner — a heurística é frágil porque conflate três coisas distintas: "tem time", "é owner", "é HR".

## Fix

Tornar **"lidera ao menos um time no workspace ativo"** um sinal explícito vindo do backend, e usar esse sinal direto no `useActiveMode`.

### 1. Migração — estender `get_account_context`

Adicionar `is_team_leader` ao JSON de retorno (calculado já existe como `v_is_leader`, basta expor):

```sql
RETURN jsonb_build_object(
  'workspace_id', v_workspace_id,
  'role', v_role,
  'is_workspace_owner', v_is_owner,
  'is_team_leader', v_is_leader,         -- NOVO
  'linked_member', v_linked,
  'has_pending_invite', v_pending
);
```

Sem mudança de comportamento pra outros consumidores — campo novo opcional.

### 2. `AccountContext` — expor `isTeamLeader`

Adicionar `isTeamLeader: boolean` ao value, derivado de `data?.is_team_leader`. Manter `isLeader` como está (não quebrar consumidores existentes que usam o sentido amplo).

### 3. `useActiveMode` — usar `isTeamLeader` como verdade

```ts
const canSeeLeader = isTeamLeader;                 // troca a heurística
const canSeeCompany = isHRAdmin || isWorkspaceOwner;
```

Resultado pro Matheus na Faster: `canSeeLeader=true`, `canSeeCompany=true` → switcher exibe "Modo: Minha equipe / Empresa". ✓
Pro Vitor (Owner do C-Level que lidera o próprio time): mesma coisa. ✓
HR Admin puro (Guto sem time): `isTeamLeader=false` → continua só com "Empresa". ✓
Líder puro: `isTeamLeader=true`, `canSeeCompany=false` → só "Minha equipe". ✓

### 4. Pequena melhoria UX no `WorkspaceSwitcher`

Quando `canSwitch=true`, garantir que o item "Minha equipe" sempre apareça primeiro (já é o caso pela ordem em `availableModes`), com o ícone `Users` e descrição secundária pequena ("Sidebar de líder"). Bug visual de ordem não foi reportado mas vale conferir.

## Arquivos tocados

- `supabase/migrations/<novo>_get_account_context_is_team_leader.sql`
- `src/contexts/AccountContext.tsx` — adicionar `isTeamLeader` ao tipo e ao value
- `src/hooks/useActiveMode.ts` — trocar heurística por `isTeamLeader`

## Fora deste fix

- Não mexe em RLS, persona, navegação.
- `isLeader` no AccountContext mantém o sentido amplo (compatibilidade).
- Sem mudança em `resolvePersona` — quem decide o modo continua sendo o `activeMode` persistido.

## Memória a atualizar

`mem://design/sidebar/active-mode-switcher` — substituir a regra "pureHRAdmin = isHRAdmin && !isWorkspaceOwner" por "canSeeLeader = data.is_team_leader (vindo de get_account_context)".
