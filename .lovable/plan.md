
## Problema

Convite do Guto travou na URL `/auth/v1/verify?token=…&redirect_to=https://rhitmo.co/hr`. Praticamente sempre é **token consumido por prefetch de e-mail** (Gmail/antivírus abre o link em background → one-shot queima → humano abre depois e fica em branco) ou **expiração de 24h**. Hoje a aba `Acessos` só tem "Convidar" + "Remover" — sem reenviar e sem status — então o HR Admin fica sem saída.

## Plano

### 1. Backend: `invite-hr-admin` ganha modo "resend" + retorna link cru

Mudanças na edge function `supabase/functions/invite-hr-admin/index.ts`:

- Aceita `action: 'invite' | 'resend'` (default `'invite'`).
- No caso `resend`, **não** chama `inviteUserByEmail` de novo (que falha se já existe). Usa `supabaseAdmin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: 'https://rhitmo.co/hr' } })` para gerar um token novo, e dispara o e-mail (o `generateLink` já envia quando a integração de e-mail do Supabase está ativa; se não, dá fallback pro mesmo template via `inviteUserByEmail` apenas se nunca logou).
- Retorna também `last_sign_in_at` e `action_link` (útil pra debugar/copiar manualmente em caso extremo — só visível pro HR Admin que está convidando, não exposto fora dela).
- Autorização continua a mesma (super admin / owner / HR Admin existente).

### 2. RPC `list_workspace_hr_admins` retorna status

Migration ajusta a função pra incluir, por HR Admin:
- `last_sign_in_at timestamptz` (do `auth.users`)
- `invited_at timestamptz` (do `auth.users.invited_at`)
- `status text` derivado: `'active'` se `last_sign_in_at IS NOT NULL`, senão `'pending'`.

Sem mudança de schema, só `CREATE OR REPLACE FUNCTION` mantendo `SECURITY DEFINER`.

### 3. UI: `src/components/settings/AccessTab.tsx`

Para cada linha de HR Admin:
- Badge **"Ativo"** (verde discreto) ou **"Convite pendente"** (âmbar).
- Se `pending`: botão **"Reenviar convite"** (ícone `RotateCw`) que chama `invite-hr-admin` com `action: 'resend'`. Toast: "Novo link enviado para `<email>`. Peça pra abrir direto no app do e-mail (sem prévia)."
- Mantém botão de remover.
- Bloco de ajuda discreto no fim do card:
  > Se o link não abrir (página em branco), o token provavelmente foi consumido pelo antivírus do e-mail. Reenvie o convite e peça pra abrir **direto do e-mail no celular**, ou peça pro convidado usar **"Esqueci minha senha"** em `rhitmo.co/auth` com o mesmo e-mail — ele já tem conta criada e cai no /hr.

### 4. Microcopy do convite atual

Atualiza o texto de ajuda do form de convite na `AccessTab` pra alinhar expectativa:

> Convite expira em 24h. Se o link travar em branco, reenvie aqui ou peça pra usar "Esqueci minha senha" no /auth.

### 5. Validação manual após deploy

- Reenviar convite pro Guto pela UI.
- Confirmar que `https://rhitmo.co/hr` continua na allowlist de Redirect URLs do Auth (Cloud → Auth → URL Configuration). Se não estiver, adicionar.
- Caso o reenvio também falhe pra ele, instruir reset de senha como fallback imediato — a conta dele já existe.

## Arquivos afetados

- `supabase/functions/invite-hr-admin/index.ts` (modo resend + generateLink)
- `supabase/migrations/<novo>.sql` (replace `list_workspace_hr_admins` com status)
- `src/components/settings/AccessTab.tsx` (badge status, botão reenviar, microcopy)

## Fora de escopo

- Mudar pra fluxo de convite custom (sem `/auth/v1/verify`): tem valor, mas é projeto maior. Por ora resolvemos o caso real do Guto com reenvio + fallback de reset de senha.
