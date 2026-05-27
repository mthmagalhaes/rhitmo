## Diagnóstico do erro do Guto

Pelos logs da edge `admin-invite-user`:

```
ERROR ❌ Invite error: AuthApiError: A user with this email address has already been registered
status: 422, code: "email_exists"
email: guto.biazzi@fstr.co
```

Guto tentou criar o time "Produto/Tech" e na aba **"Convidar novo"** digitou um e-mail que **já existe** em `auth.users` (no caso, o próprio e-mail dele). A edge derruba 400, a UI mostra o toast genérico **"Edge Function returned a non-2xx status code"** e o botão "Criar time" continua desabilitado porque o `leader` não foi setado. Guto fica preso sem entender o que aconteceu.

Outros problemas operacionais que ele relatou:
- **Sem visibilidade do status**: depois de criar time + convidar líder, ele não enxerga em lugar nenhum "convidei X, aguardando aceite, último envio Y".
- **Muitos cliques**: 2 steps no dialog + LeaderPicker com 2 sub-tabs, sem atalho pra "eu mesmo sou o líder".
- **Sem alternativa pra corner cases**: usuário já cadastrado, e-mail digitado errado, líder que já lidera outro time, etc.

## O que vamos entregar

### 1. Edge `admin-invite-user`: handle "user already exists"

Quando `inviteUserByEmail` devolver `email_exists` (status 422 / code `email_exists`):

1. Buscar o usuário existente via `supabaseAdmin.auth.admin.listUsers` filtrado por email (ou query direta em `auth.users` por service role).
2. Devolver `200` com `{ success: true, user_id, already_existed: true, was_confirmed: <bool> }` em vez de 400.
3. Pular o reenvio de e-mail de convite (o usuário já existe — opcionalmente reenviar magic link se `was_confirmed === false`, controlado por flag `resend: true` no body).
4. Continuar o restante do fluxo (HR Admin add, bootstrap legado, `waitlist_leads.update`, `emit member.invited`) usando o `user_id` resolvido.

Frontend (`LeaderPicker.handleInvite`):
- Se `already_existed && was_confirmed`: toast info "Esse e-mail já tem conta na Rhitmo. Vinculei direto como líder." e seta o `leader` com `pending: false`.
- Se `already_existed && !was_confirmed`: toast info "Já havia um convite pendente para esse e-mail. Vinculei como líder e reenvio disponível." com `pending: true`.

### 2. UX: reduzir cliques no Novo Time

`NewTeamDialog`:
- Mostrar **3 opções claras** já no step 1, em vez do wizard cego:
  - **Botão primário "Sou eu o líder"** (1 clique → cria time direto, mesmo para HR/Owner — útil quando o próprio HR vai liderar)
  - **"Escolher alguém do workspace"** (abre LeaderPicker aba existente)
  - **"Convidar novo líder por e-mail"** (abre LeaderPicker aba invite)
- Step 2 vira o conteúdo correspondente, com **"Voltar"** sempre visível.
- Validação: nome + leader_user_id antes de habilitar "Criar time" (já existe; manter).

### 3. Aba "Convites" — status visível do que Guto fez

Hoje a aba **Convites** em `/lider/pessoas` mostra convites de liderados, mas **não convites de líder** feitos via NewTeamDialog. Vamos:

- Estender a RPC `get_workspace_teams_overview` (criada na sprint anterior) ou criar `get_workspace_invitations` que devolve:
  - Convites pendentes (líder, liderado, HR) — `email`, `role`, `invited_at`, `invited_by`, `team_name`, `status` (`pending` / `accepted` / `expired`).
  - Resolve `accepted` por `auth.users.email_confirmed_at IS NOT NULL` ou `last_sign_in_at IS NOT NULL`.
- Na aba **Convites**, adicionar seção **"Convites recentes"** com cada linha mostrando:
  - Nome + e-mail
  - Badge: `Aguardando aceite` (amber) · `Aceito` (emerald) · `E-mail já registrado` (slate)
  - Time vinculado (se houver)
  - Ações: **Reenviar convite**, **Copiar link**, **Remover convite** (se ainda pending)

### 4. Toast de erro: mensagens humanas

`LeaderPicker` e `NewMemberDialog` hoje fazem `toast.error(err?.message)`. Trocar para um map:

```ts
function humanizeInviteError(err: any): string {
  const code = err?.context?.code || err?.code;
  if (code === 'email_exists') return 'Esse e-mail já tem conta. Use "Escolher existente" pra vincular como líder.';
  if (err?.message?.includes('non-2xx')) return 'Não consegui enviar o convite. Tenta de novo em alguns segundos.';
  return err?.message ?? 'Erro ao convidar';
}
```

## Arquivos afetados

```text
supabase/functions/admin-invite-user/index.ts   (handle email_exists → resolve user, return 200)
src/components/teams/LeaderPicker.tsx           (consome already_existed, humanize error)
src/components/NewTeamDialog.tsx                (3 opções no step 1, atalho "Sou eu o líder")
src/pages/lider/Pessoas.tsx                     (aba Convites: seção convites de líder + status)
supabase/migrations/<ts>_invitations_overview.sql (RPC get_workspace_invitations)
```

## Fora do escopo

- Reescrever fluxo de bulk onboarding.
- Mexer no `/setup` wizard.
- Mudar tabelas existentes (`teams`, `team_members`) — só nova RPC + ajuste de edge.

## Validação (com Guto)

1. Guto cria "Produto/Tech" → clica "Convidar novo" → digita e-mail dele mesmo → vê toast **"Esse e-mail já tem conta, vinculei como líder"** + time criado.
2. Convida outro líder novo → vê na aba **Convites** linha com badge **"Aguardando aceite"** + botão **Reenviar**.
3. Quando o líder aceitar e fizer login, a linha vira **"Aceito"** no próximo refresh.
