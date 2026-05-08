# Diagnóstico — Ana Campos ([carolyna@fapeduca.com.br](mailto:carolyna@fapeduca.com.br))

## O que aconteceu (timeline real, do banco)


| Quando (UTC 08/05)  | Evento                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 12:56:35            | Convite criado por admin (`admin-invite-user`, plano `pro` = líder)                                              |
| 12:56:37 → 12:56:39 | Email "invite" enfileirado e **enviado com sucesso** (status `sent`, message_id confirmado)                      |
| 12:59:49            | Ana clicou no link, **confirmou o email e definiu senha** (`email_confirmed_at` + `last_sign_in_at` preenchidos) |
| 13:07:52            | Tentou **signup** novamente em `rhitmo.co/dashboard` → 422 "User already registered"                             |


**Conclusão:** o email chegou, ela criou a conta, mas depois ficou confusa e tentou se cadastrar de novo em vez de fazer login. Além disso, **não existe workspace nem team** vinculados ao usuário dela — então mesmo logando ela cai num app sem lugar pra ir (não há trigger que crie workspace automaticamente para líder convidado via `admin-invite-user`).

## O que o email diz (template `invite.tsx`)

- Assunto: **"Você foi convidado para o Rhitmo!"**
- Corpo: "Você foi convidado para participar do Rhitmo. Clique no botão abaixo para aceitar o convite e criar sua conta."
- Botão: **"Aceitar Convite"** → `https://rhitmo.co/dashboard`

Ou seja, o email manda direto pra `/dashboard`, não para um fluxo explícito de "sou líder, vamos configurar seu workspace". Esse é o gap.

## Por que ela "não consegue logar"

1. **Ela já tem conta** — precisa usar **Entrar** (login com email + senha que ela definiu), não **Cadastrar**.
2. Se esqueceu a senha, precisa de "Esqueci minha senha" → recovery email.
3. Mesmo logando, ela não tem workspace/team de líder, então cai numa tela vazia/quebrada — precisamos provisionar isso.

---

## Plano de ação (2 partes)

### Parte A — Destravar a Ana **agora** (one-shot, manual)

1. **Disparar reset de senha** para `carolyna@fapeduca.com.br` (caso ela tenha esquecido a senha que definiu) usando a função `admin-reset-password` já existente. Resultado: ela recebe email "Redefinir senha" e entra com nova senha.
2. **Provisionar workspace + team de líder** para o `user_id` `88d0a572-3693-4d3f-9321-1d9f0db5ae14` via migration:
  - `INSERT INTO workspaces (name, owner_id, plan_tier)` → ex.: nome "Fapeduca", `plan_tier='pro'`
  - `INSERT INTO teams (name, leader_user_id, workspace_id)` → ex.: "Time da Ana"
  - Confirmar que `AccountContext` resolve papel **Leader** e a leva para `/lider/inicio`
3. (Opcional) mandar uma DM/email manual avisando "use **Entrar** com seu email; segue novo link de senha".

### Parte B — Causa raiz: convite de líder hoje não cria workspace

Hoje `admin-invite-user` com `role` ≠ `hr_admin` apenas convida no Auth e redireciona para `/dashboard`. Para qualquer próximo líder convidado, vamos:

1. No `admin-invite-user`, quando `role` for `'leader'` (ou ausente + `assigned_plan='pro'`), passar `data: { ..., persona: 'leader' }` no metadata e mudar `redirectTo` para `https://rhitmo.co/onboarding?persona=leader`.
2. Garantir que `Onboarding.tsx` (já existente) detecta `persona=leader` sem workspace e dispara o **Leader Bootstrap Wizard**:
  - Pergunta nome do workspace/empresa
  - Cria `workspaces` (owner_id = user, plan_tier herdado do convite) + `teams` (leader_user_id = user) via RPC `bootstrap_leader_workspace` (a criar, `SECURITY DEFINER`, idempotente)
  - Redireciona para `/lider/inicio`
3. Atualizar o template `invite.tsx`:
  - Mudar copy do botão para "Aceitar convite e configurar minha conta"
  - Acrescentar 1 linha: "Se você já criou sua senha antes, vá direto para [rhitmo.co](https://rhitmo.co/auth) e clique em **Entrar**."

## Arquivos afetados (Parte B)

- `supabase/functions/admin-invite-user/index.ts` — branch `redirectTo` por persona + metadata.
- `supabase/migrations/...` — nova RPC `bootstrap_leader_workspace(_name text)`.
- `src/pages/Onboarding.tsx` — detectar `persona=leader` sem workspace + UI mínima do wizard (1 input + CTA).
- `supabase/functions/_shared/email-templates/invite.tsx` — copy + nota de "já tenho conta".

## Fora de escopo

- Mudar fluxo de HR Admin (já funciona, cria workspace).
- Refatorar AuthPage além da mudança de copy do email.
- Migrar Ana para outro plano — fica `pro` como já foi convidada.

## Antes de eu executar, confirme:

1. **Parte A** — posso já criar o workspace/team da Ana agora (preciso só do **nome do workspace** — sugiro "Fapeduca") e disparar o reset de senha?
2. **Parte B** — toco a causa raiz neste mesmo turno depois da Parte A, ou prefere deixar para outro momento?  
  
No final, me diga exatamente o que eu preciso falar para a Ana. ela abriu um "ticket" de suporte para mim, é como se fosse isso e eu preciso devolver.
3. &nbsp;