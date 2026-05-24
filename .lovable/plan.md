# Plano: HR Admin estrutura o workspace (setup-first)

Premissa nova validada com você:

- **HR Admin é o "setup man"** do workspace. Antes de qualquer time existir com gente dentro, ele precisa ter um **líder definido**.
- Líder pode ser usuário já cadastrado **ou** um placeholder provisionado no momento do convite (pre-criado em `auth.users` via `admin-invite-user`, igual ao fluxo bulk já existente). O `leader_user_id` é gravado mesmo antes do líder aceitar.
- Criar time **sem líder é bloqueado**. Adicionar liderado a time sem líder já é bloqueado pelo trigger `enforce_member_team_has_leader` — vamos reforçar na UI.

## Fluxo desejado para o Guto

```text
1. Guto entra em  /hr/teams
2. Clica "Novo time"
   ├─ Campo obrigatório: Nome do time
   └─ Campo obrigatório: Líder do time
       ├─ [Buscar] usuário existente do workspace (autocomplete)
       └─ [Convidar novo líder] → email + nome → cria auth.user via
                                  admin-invite-user (role=leader),
                                  retorna user_id, grava em leader_user_id
3. Time criado com leader_user_id já preenchido → Guto pode:
   • Adicionar liderados (bulk ou individual)
   • Trocar líder depois (EditTeamDialog ganha campo Líder)
   • Arquivar/deletar time
```

## Mudanças

### 1. `NewTeamDialog` — vira wizard de 2 passos

- **Passo 1: Nome do time** (já existe).
- **Passo 2: Definir líder** (novo, obrigatório):
  - Tab "Escolher existente": autocomplete `profiles` do workspace (filtra owner + HR Admins + líderes existentes + liderados linkados).
  - Tab "Convidar novo líder": form (nome, email) → chama edge function `admin-invite-user` com `role: 'leader'`, `workspace_id`, retorna `user_id`.
- Submit final: `INSERT teams (name, workspace_id, leader_user_id=<resolved>)`.
- Botão "Criar" desabilitado enquanto `leader_user_id` for null.
- Comportamento antigo (HR vira líder automaticamente) **só** é mantido se o usuário criando for um **líder comum** (não HR Admin / não Owner). Para HR/Owner é sempre obrigatório escolher.

### 2. `EditTeamDialog` — ganha campo "Líder do time"

- Hoje só renomeia. Adicionar select com mesmo autocomplete + opção "Convidar novo líder".
- Permitido apenas para `isHRAdmin || isWorkspaceOwner`. Líder comum continua só renomeando.
- UPDATE `teams SET leader_user_id = ?, name = ?`.
- Se o novo líder é placeholder pendente, manter aviso no UI: "Líder ainda não aceitou o convite".

### 3. `/lider/pessoas` aba Times — coluna "Líder" + alertas

- Listar `leader_user_id` resolvido (nome + email). Se `null`, badge âmbar "Sem líder — definir agora" que abre `EditTeamDialog`.
- Se líder é placeholder (sem `last_sign_in_at`), badge azul "Aguardando aceite".
- Ordenar: sem líder primeiro.

### 4. Bloqueio defensivo em "Adicionar liderado"

- Hoje o trigger já barra no banco; melhorar UX: se time selecionado tem `leader_user_id IS NULL`, desabilitar botão "Adicionar liderado" / "Bulk invite" com tooltip "Defina o líder do time primeiro".
- No `BulkOnboardDialog`, validar antes de submeter.

### 5. Edge function `admin-invite-user` — confirmar suporte a `role='leader'`

- Já existe e é usada pelo bulk. Garantir que aceita chamada one-off (não-bulk) e devolve `user_id` para o frontend salvar em `leader_user_id` na mesma transação client-side.
- Sem mudança de schema. Sem nova função.

### 6. Onboarding do HR Admin recém-aceito (fora de escopo agora)

- Não vamos mexer ainda. Apenas garantir que `/lider/pessoas` mostra um **empty state forte** para HR Admin que entra num workspace sem times: card "Comece criando o primeiro time" → abre `NewTeamDialog`.

## Não-objetivos deste loop

- Sem mudança em RLS (`enforce_member_team_has_leader` já cobre o caso crítico no banco).
- Sem mudança em `/admin` (super admin continua com fluxo dele).
- Sem novo schema. Sem migration.
- Sem tocar Mentor Chat / briefs / homes.

## Riscos

- Convidar "líder" via `admin-invite-user` cria assento no plano antes do aceite — confirmar que o plano da Faster Ops (override Enterprise) cobre isso.
- Se Guto trocar líder de um time com histórico, feedbacks antigos do líder anterior **continuam visíveis para ele** (manager_id é imutável); novo líder só vê dali pra frente. Já documentado em `mem://security/historical-data-visibility-integrity`. Não vamos mexer.

## Arquivos previstos

- `src/components/NewTeamDialog.tsx` — refator para wizard 2 passos.
- `src/components/EditTeamDialog.tsx` — adicionar campo líder.
- `src/components/teams/LeaderPicker.tsx` — **novo**, componente reutilizado nos 2 dialogs (autocomplete + tab convidar).
- `src/pages/lider/Pessoas.tsx` — coluna Líder + empty state + guard no botão de adicionar liderado.
- `src/components/BulkOnboardDialog.tsx` — checar `leader_user_id` do time alvo antes de habilitar submit.

Pronto pra implementar quando você aprovar.