

## Diagnóstico

Hoje `bulk-onboard` faz tudo de uma vez: cria usuários + estrutura + dispara emails (Supabase invite + welcome customizado). Você quer **separar** essas responsabilidades: o import cuida de tudo **menos** disparar email; o disparo vira um botão manual no Admin → Estrutura, controlado por você.

Confirmei o fluxo:
- `bulk-onboard/index.ts` (linha ~110): chama `supabaseAdmin.auth.admin.inviteUserByEmail()` — isso **já dispara o email de convite oficial do Supabase** (template "Invite user")
- `bulk-onboard/index.ts` (linha ~210): chama `send-transactional-email` com `member-welcome` / `leader-welcome` / `hr-admin-welcome` — segundo email customizado

Pra "criar usuário sem email", o Supabase oferece `auth.admin.createUser({ email, email_confirm: false })` em vez de `inviteUserByEmail`. Isso cria o user no banco mas **não manda email nenhum**. Quando você quiser disparar depois, usamos `auth.admin.generateLink({ type: 'invite' })` pra gerar o link e mandar via `send-transactional-email` com o template de boas-vindas (que pode incluir o link de aceite).

## Plano

### 1. Refatorar `bulk-onboard` (modo silencioso)

Trocar `inviteUserByEmail` por `createUser({ email_confirm: false })`. Remover o bloco que dispara `send-transactional-email`. Resultado: usuários criados, times criados, HR Admin atribuído, members linkados — **zero emails enviados**.

Adicionar coluna `invite_dispatched_at` (nullable) na tabela auxiliar pra rastrear quem já recebeu. Como não temos tabela própria pra isso, vou usar `auth.users.raw_user_meta_data.invite_dispatched_at` (campo livre) — sem migration.

### 2. Nova edge function `dispatch-bulk-invites`

Recebe `{ workspace_id }`. Faz:
- Lista usuários ligados ao workspace (via `teams.leader_user_id`, `team_members.linked_user_id`, `workspaces.hr_admin_ids`, `workspaces.owner_id`) que ainda **não têm senha definida** (`auth.users.encrypted_password IS NULL` ou `last_sign_in_at IS NULL` + `invite_dispatched_at IS NULL`)
- Pra cada um: gera link de invite via `generateLink({ type: 'invite', email })` → dispara `send-transactional-email` com template tailored ao papel (leader/member/hr_admin) incluindo o link
- Marca `invite_dispatched_at = now()` no metadata
- Retorna summary `{ sent, skipped, errors }`

Permissão: só super_admin via `check_is_admin`.

### 3. UI no Admin → Estrutura

Adicionar botão **"Disparar convites pendentes"** (ícone `Mail`) no header de cada workspace card (em `AdminStructure.tsx`), ao lado do badge "Ativo":

```text
┌─────────────────────────────────────────────────────────────┐
│ 🏢 FAP - Faculdade Baixo Parnaíba   Owner: Mateus  [pro]    │
│                          [📧 Disparar 7 convites] [Ativo]   │
└─────────────────────────────────────────────────────────────┘
```

O botão:
- Mostra contador de pendentes (query rápida ao montar)
- Ao clicar: confirm dialog → invoca `dispatch-bulk-invites` → toast com summary
- Some quando contador = 0

### 4. Feedback visual no template populado

Atualizar copy do `BulkOnboardDialog` pra deixar claro: "Os usuários serão criados sem receber email. Você dispara os convites manualmente em Estrutura → Disparar convites."

## Arquivos a modificar

- `supabase/functions/bulk-onboard/index.ts` — trocar invite por createUser, remover envio de email (~30 linhas alteradas)
- `supabase/functions/dispatch-bulk-invites/index.ts` — **nova** (~120 linhas)
- `src/components/admin/AdminStructure.tsx` — adicionar botão + dialog (~40 linhas)
- `src/components/admin/BulkOnboardDialog.tsx` — atualizar copy (~5 linhas)

Zero migrations. Zero novas tabelas.

## Pontos a confirmar

1. **Re-disparo**: se você clicar 2x no botão, devo bloquear quem já recebeu (via `invite_dispatched_at`) ou permitir reenvio? Sugiro **bloquear por padrão** + checkbox "incluir já enviados" no dialog.
2. **Template do email**: quando disparar manualmente, mando o `leader-welcome` / `member-welcome` / `hr-admin-welcome` existente (com o link de aceite incluído no botão CTA), ou crio um template novo "convite manual"? Sugiro **reusar os existentes** — só adapto o CTA pra apontar pro link de invite gerado.
3. **Escopo do botão**: dispara só pros pendentes do **workspace específico** (botão por card) ou um botão global "Disparar todos os pendentes da plataforma"? Sugiro **por workspace** pra você ter controle granular.

