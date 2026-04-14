

## Plano: Avatar para Líderes + Migração de Avatares Existentes

### Problema identificado
1. **Líderes não podem editar avatar** — o `ProfileSettingsDialog` não tem seletor de avatar
2. **Liderados já podem editar** via `DirectReportDashboard` (tab Perfil) — mas o hook `useLinkedMember` não busca o campo `avatar`
3. **Avatares atuais** dos membros existentes ainda usam DiceBear (URLs externas) ou estão nulos

---

### Mudanças

#### 1. Corrigir `useLinkedMember.ts` — buscar campo `avatar`
Adicionar `avatar` no select da query para que o liderado veja seu avatar atual corretamente.

#### 2. Adicionar seletor de avatar no `ProfileSettingsDialog.tsx`
- Importar `AvatarLibrary` e `MemberAvatar`
- Buscar o workspace owner/leader e seu avatar atual
- Renderizar avatar clicável no topo do dialog com botão "Trocar Avatar"
- Salvar no campo `avatar` da tabela correta (provavelmente `workspaces` ou via user metadata)

**Desafio:** Líderes não estão na tabela `team_members` — precisamos verificar onde armazenar o avatar do líder. Opções:
- Usar `user_metadata` do auth (mais simples, sem migração)
- Criar coluna `avatar` em `workspaces` (se não existir)

#### 3. Migração SQL — randomizar avatares de todos os `team_members`
```sql
UPDATE team_members 
SET avatar = 'avatar-' || (floor(random() * 24) + 1)::int
WHERE avatar IS NULL OR avatar LIKE 'https://%';
```
Isso atribui um avatar aleatório (avatar-1 a avatar-24) para todos os membros que ainda não têm um avatar custom.

#### 4. Avatar do líder no sidebar (`AppSidebar.tsx`)
O `MemberAvatar` no footer da sidebar já renderiza o avatar — precisamos garantir que ele receba o avatar salvo do líder.

---

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useLinkedMember.ts` | Adicionar `avatar` no select |
| `src/components/ProfileSettingsDialog.tsx` | Adicionar seção de avatar com `AvatarLibrary` |
| `src/components/AppSidebar.tsx` | Passar avatar do líder para `MemberAvatar` |
| Migração SQL | Randomizar avatares dos membros existentes |

