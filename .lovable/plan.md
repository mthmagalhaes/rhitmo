

## Atualizar Biblioteca de Avatares + Sincronizar Avatar nos Cards do Líder

### O que muda

#### 1. `src/components/avatar/AvatarLibrary.tsx` — Substituir seeds
Remover estilos `lorelei` e `fun-emoji`. Manter apenas:
- **12 avataaars**: Alex, Sam, Jordan, Taylor, Casey, Riley, Morgan, Quinn, Avery, Blake, Drew, Charlie
- **12 notionists**: Felix, Luna, Mia, Oliver, Zara, Leo, Iris, Sage, Kai, Nora, Theo, Ava

Total: 24 avatares (12+12), somente esses dois estilos.

#### 2. `src/components/MemberAvatar.tsx` — Aceitar avatar customizado
Adicionar prop opcional `avatarUrl?: string | null`. Quando presente e não-vazio, usar esse URL em vez do Boring Avatars. Isso faz com que o avatar escolhido pelo liderado apareça em TODOS os lugares que usam `MemberAvatar` (cards do líder, sidebar, member details, pending invites).

#### 3. `src/components/TeamMemberCard.tsx` — Passar avatar do DB
O `TeamMember` já tem campo `avatar: string`. Passar `avatarUrl={member.avatar}` para `MemberAvatar`.

#### 4. `src/pages/Index.tsx` — Já busca `avatar` via `select('*')`
A query já retorna o campo `avatar` do `team_members`. Os cards já recebem o member com avatar. Basta o `TeamMemberCard` repassar para `MemberAvatar`.

#### 5. `src/pages/MemberDetails.tsx` — Passar avatar
Mesma lógica: passar `avatarUrl` para `MemberAvatar`.

#### 6. `src/components/team/PendingInvitesSection.tsx` — Sem avatar salvo disponível aqui, mantém fallback Boring Avatars

#### 7. Invalidação de cache
O `AvatarLibrary.handleSave` já faz `invalidateQueries(['linked-member'])`. Adicionar também invalidação de `['team-members']` para que o painel do líder reflita a mudança em tempo real.

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/avatar/AvatarLibrary.tsx` | Substituir seeds por 12 avataaars + 12 notionists; invalidar query `team-members` |
| `src/components/MemberAvatar.tsx` | Adicionar prop `avatarUrl`; priorizar sobre Boring Avatars |
| `src/components/TeamMemberCard.tsx` | Passar `avatarUrl={member.avatar}` |
| `src/pages/MemberDetails.tsx` | Passar `avatarUrl` para MemberAvatar |

### Fluxo resultante
1. Liderado abre perfil → clica "Trocar Avatar" → escolhe entre 24 opções (avataaars/notionists)
2. Salva → `team_members.avatar` é atualizado no DB
3. Cache `linked-member` + `team-members` invalidado
4. No dashboard do líder, `TeamMemberCard` renderiza `MemberAvatar` com o `avatarUrl` do DB
5. Se `avatar` é null (nunca escolheu), fallback automático via Boring Avatars (comportamento atual)

