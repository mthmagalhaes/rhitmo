## Contexto
Guto está em **/hr/membros** (HR Admin do Faster). Hoje, para editar dados ou reenviar convite de um liderado, ele precisa:
1. Clicar em "Ver Perfil" → abre o sheet à direita
2. Abrir o menu `...` no topo do sheet
3. Escolher "Editar liderado" ou "Reenviar convite"

Isso fica escondido. As ações já existem (`EditMemberDialog`, `admin-invite-user`), só não estão acessíveis direto da lista.

## O que muda

### 1. Ações rápidas em cada linha da lista
Em `src/pages/HRMembers.tsx`, no card de cada liderado, adicionar (à direita do "Ver Perfil") um menu kebab `...` com:
- **Editar dados** → abre `EditMemberDialog` (nome, cargo, time)
- **Reenviar convite** → só aparece para quem tem `invite_status !== 'accepted'`; chama `admin-invite-user` e exibe toast
- **Remover** → confirma e remove (mesma lógica já no Sheet)

Mantém o "Ver Perfil" para quem quer a visão completa.

### 2. Lembrete em massa para pendentes
O botão **"Disparar convites pendentes"** que já existe no header faz exatamente isso (reenviar para todo mundo com convite não aceito). Ajustar o texto/tooltip para deixar claro que é um **lembrete de cadastro**, e mostrar um contador inline (ex.: "Lembrar pendentes (3)") puxando de `members.filter(m => m.invite_status && m.invite_status !== 'accepted').length`.

### 3. Badge clicável de "Aguardando aceite"
Hoje o badge âmbar é só visual. Vira um botão pequeno que dispara o reenvio individual com 1 clique, sem precisar abrir menu.

## Fora de escopo
- Edição de e-mail do liderado (envolve `auth.users`, perigoso — não vamos abrir agora).
- Reescrita do `MemberProfileSheet`.
- Mexer em RLS: `team_members` já permite update/delete por HR Admin via policies atuais.

## Arquivos tocados
- `src/pages/HRMembers.tsx` — adiciona kebab por linha + estado `editingMember`, `actingId`; reutiliza `EditMemberDialog` e função de reenviar (copiada do Sheet ou extraída para `useResendInvite` hook).
- (opcional, se ficar repetido) `src/hooks/useResendMemberInvite.ts` — extrai a chamada a `admin-invite-user` para reuso entre Sheet e lista.

## Validação
1. Como Guto: clicar no `...` de uma linha → "Editar dados" → mudar cargo → salvar → linha atualiza.
2. Como Guto: clicar no badge "Aguardando aceite" da Bianca → toast "Convite reenviado".
3. Header mostra "Lembrar pendentes (N)" e botão fica desabilitado quando `N=0`.
