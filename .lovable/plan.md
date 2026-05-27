## Problema

Em `/liderados` (rota RH), o `MemberProfileSheet` é só leitura. Guto consegue ver perfil, mas não tem botão para editar (nome, cargo, time, líder) nem excluir/reenviar convite. Os componentes operacionais (`EditMemberDialog`, ações de remover, reenviar) existem mas estão só no fluxo do líder em `/lider/pessoas` via `MemberAdminSheet`.

## Onde criar essas funções (recomendação)

**Dentro do próprio `MemberProfileSheet`**, e não em uma nova rota. Justificativa:

- Guto já abre o sheet pra ver o perfil — adicionar ações no mesmo lugar = 1 clique a menos.
- Mantém o padrão Master-Detail já estabelecido (lista à esquerda, sheet à direita com tudo).
- Evita duplicar uma "tela de admin" que repete o que `MemberAdminSheet` já faz no lado do líder.
- A página `/lider/times` continua sendo o lugar certo para mover liderados entre times em lote e trocar liderança de time inteiro (já tem `EditTeamDialog` + bulk move). Não muda.

## Plano de implementação

### 1. `MemberProfileSheet.tsx` — adicionar barra de ações

No header do sheet (ao lado do nome), adicionar menu kebab com:

- **Editar liderado** → abre `EditMemberDialog` reaproveitado (já permite mudar nome, cargo e time, inclusive criar novo time inline).
- **Trocar líder** → submenu/dialog simples reusando `LeaderPicker` (já existe) para atualizar `team_members.manager_id` direto.
- **Reenviar convite** → visível só se `invite_status = 'pending'`; chama edge `admin-invite-user` com `resend: true`.
- **Remover liderado** → `AlertDialog` de confirmação, deleta via `team_members` (RLS já foi corrigida para HR Admin no migration anterior).

### 2. Pequenos ajustes em `HRMembers.tsx`

- Após qualquer ação no sheet, invalidar `['hr-members']` e `['hr-member-profile']` (já tem padrão de invalidação).
- Adicionar badge de status do convite (`Aceito` / `Aguardando aceite`) no card da lista, pra Guto ver de relance quem ainda não entrou — hoje só dá pra inferir.

### 3. Garantir RPC `get_hr_member_profile` retorna campos necessários

Verificar se já retorna `invite_status`, `team_id`, `manager_id`. Se não, ajustar a função (migration) para incluir, sem mudar shape de outros consumers.

### 4. Não mexer em

- `MemberAdminSheet` do líder (continua intocado).
- Rota `/lider/times` (continua sendo o lugar para gestão em massa de times).
- RLS (migration anterior já liberou HR Admin).

## Resultado para o Guto

Abre liderado → vê perfil → mesmo painel tem botão pra editar dados, trocar líder, reenviar convite ou remover. Zero navegação extra, status do convite visível na lista.
