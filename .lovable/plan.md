## Problema

Guto é HR Admin (não-Owner) → cai na sidebar `/hr/*`. As páginas `/hr/teams` e `/hr/members` são read-only hoje. Os dialogs de criação (`NewTeamDialog`, `NewMemberDialog`, `BulkOnboardDialog`) só existem em `/lider/pessoas` e no dropdown do WorkspaceSwitcher (esse último só "Convidar membros" individual). Resultado: HR Admin não consegue cadastrar time, líder ou liderado sem saber do botão "Ver como Líder".

## Solução

Reusar os dialogs existentes (já têm RLS/permissões corretas) plugando-os nos headers das páginas HR. Zero migration, zero mudança em backend.

### 1. `/hr/teams` — botão "Novo Time"
- Adicionar `<Button>` "Novo Time" no header, à direita do `<h1>`
- Abrir `NewTeamDialog` (que já tem o fluxo wizard de 2 passos: nome + LeaderPicker)
- `LeaderPicker` já permite escolher qualquer usuário do workspace como líder → resolve "cadastrar líder"
- Após sucesso: invalidar `['hr-leaders', workspaceId]`

### 2. `/hr/members` — botões "Convidar liderado" + "Importar em massa"
- Header com 2 botões: "Convidar liderado" (abre `NewMemberDialog`) + "Importar em massa" (abre `BulkOnboardDialog`)
- Memória `mem://features/people/member-admin-sheet-rhitmo-sync` confirma: bulk só HR/Owner — Guto é HR Admin, está ok
- `NewMemberDialog` precisa do `workspaceId` (já disponível via `useHRAdmin`) e provavelmente um `leaderId` — checar assinatura; se obrigar líder, expor seletor de líder dentro do próprio dialog (já é o padrão dele em /lider/pessoas) ou passar `null` para HR Admin escolher
- Após sucesso: invalidar `['hr-members', workspaceId]` e `['hr-leaders', workspaceId]`

### 3. Empty states
- Quando `/hr/teams` retorna lista vazia: substituir o card "Nenhum líder cadastrado" por CTA primário "Criar primeiro time"
- Quando `/hr/members` retorna lista vazia: CTA primário "Convidar primeiro liderado"

### 4. Resposta imediata pro Guto (chat)
Mensagem explicando o workaround atual (Ver como Líder → /lider/pessoas) enquanto a build sobe, e avisando que vai resolver na sidebar de HR.

## Arquivos afetados

- `src/pages/HRTeams.tsx` — header com botão + dialog + invalidação
- `src/pages/HRMembers.tsx` — header com 2 botões + dialogs + invalidação
- (verificar assinatura de `NewMemberDialog` e `BulkOnboardDialog` antes de plugar)

## Fora de escopo

- Não mexer em RLS / migrations (dialogs existentes já têm permissões corretas)
- Não mover dialogs para WorkspaceSwitcher (memória já fixa que bulk fica em /admin + /lider/pessoas; agora ganha /hr/* também por simetria de persona)
- Não tocar `/lider/pessoas` — segue como hub do líder

## Memória a atualizar

- `mem://features/people/member-admin-sheet-rhitmo-sync` → adicionar nota "HR Admin também tem CTAs de criar time/liderado/bulk em /hr/teams e /hr/members"
