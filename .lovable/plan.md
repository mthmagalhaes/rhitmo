

# Polish do Programa Fundadores — execução

Plano aprovado anteriormente, agora formalizado para execução. Inclui as 3 decisões finais:
1. **`isFounderProgram`**: re-fetch `is_beta_user` após criar workspace (try/catch silencioso, não bloqueia).
2. **WhatsApp**: placeholder `wa.me/5541999999999` com TODO no comentário.
3. **`leaderName`**: nunca passar email cru — só `display_name`/`full_name`. Se vazio, omite a prop e o template usa fallback `"Olá, Líder!"`.

## Execução

### P0

1. **`leader-welcome.tsx`** — adicionar prop `isFounderProgram?: boolean`. Subject vira função: retorna `"Bem-vindo ao Programa Fundadores Rhitmo 🎟️"` se `isFounderProgram`, senão mantém atual. Quando `true`: heading "Você está entre os 20 primeiros, {leaderName}", copy sobre os 6 meses gratuitos, lista de 4 passos para os primeiros 7 dias, bloco lateral com `matheus@rhitmo.co` + SLA de 4h. Fallback `dashboardUrl` → `https://rhitmo.co/dashboard`. Branch genérico inalterado.

2. **`member-welcome.tsx`** — fallback `syncUrl` → `https://rhitmo.co`.

3. **`WorkspaceOnboarding.tsx`** — após `INSERT` do workspace e antes do `invoke('send-transactional-email')`, re-fetch:
   ```ts
   let isFounderProgram = false;
   try {
     const { data: ws } = await supabase
       .from('workspaces')
       .select('is_beta_user')
       .eq('id', workspace.id)
       .maybeSingle();
     isFounderProgram = !!ws?.is_beta_user;
   } catch { /* silencioso, segue genérico */ }
   ```
   Trocar `leaderName` para usar **só** `user.user_metadata?.full_name || user.user_metadata?.display_name || undefined` (remover o `email.split('@')[0]` que vaza email).

4. **`InviteMemberDialog.tsx`** — adicionar botão **"Enviar convite por email"** (apenas quando `member.email` existe), na branch `pending`. Ao clicar:
   - Buscar `display_name`/`full_name` via `supabase.auth.getUser()` (nunca email).
   - `supabase.functions.invoke('send-transactional-email', { body: { templateName: 'member-welcome', recipientEmail: member.email, idempotencyKey: 'invite-${member.id}-${invite_token}', templateData: { memberName: member.name, leaderName: <nome ou undefined>, syncUrl: 'https://rhitmo.co/invite?code=${invite_token}' } } })`.
   - Loading state, toast sucesso/erro. "Copiar link" continua como secundário.

5. **`SetupChecklist.tsx`** — voltar para 5 passos:
   - Cadastrar primeiro liderado (`hasMembers`)
   - Convidar liderado por email (novo: `onOpenInvite`, `disabled: !hasMembers`)
   - Criar nota de teste (`hasFeedbacks`, `disabled: !hasMembers`)
   - Abrir Mentor Chat (restaurar `hasMentorChat` — remover prefixo `_`)
   - Configurar Leader Sync (`hasLeaderSync`)
   
   Adicionar prop `onOpenInvite: () => void`.

6. **`Index.tsx`** — passar `onOpenInvite` ao `<SetupChecklist>` que abre o `InviteMemberDialog` para o primeiro membro com `invite_status !== 'accepted'`. Trocar label `'Beta'` (l.520) por `'Fundador'`.

### P1

7. **`HelpCenter.tsx`** — atualizar descrição do Slack (l.315): listar `/rhitmo`, `/nota`, `/kudos`, `/brief`, `/mentor`, `/meu-rhitmo`. Atualizar passo do card `h-integrations` (l.295) também.

8. **`AppSidebar.tsx`** — no `SupportDialog` (l.491-516), adicionar bloco condicional `{limits.isBetaUser && ...}` com:
   - Texto "Você é Fundador. Resposta em até 4h em horário comercial."
   - Botão WhatsApp `wa.me/5541999999999` com `{/* TODO: substituir pelo número real */}`.
   - Importar `useEnforcedLimits` (que já expõe `isBetaUser`).

### i18n — adicionar 3 chaves em pt-BR/en/es

```json
"setup": {
  ...
  "inviteFirstMember": "Convide seu primeiro liderado por email",
  "inviteAction": "Convidar →",
  "openMentorChat": "Faça sua primeira pergunta ao Mentor Chat",
  "mentorChatAction": "Abrir Mentor →"
}
```

### Deploy

`supabase--deploy_edge_functions(["send-transactional-email"])` para recarregar templates.

## Critérios de aceite

- [ ] Líder beta criando workspace → email com subject "Programa Fundadores 🎟️" e copy pessoal.
- [ ] Líder não-beta → email genérico atual, sem regressão.
- [ ] Re-fetch falha silenciosamente → segue com template genérico, sem toast de erro.
- [ ] `leaderName` nunca contém email — se sem nome, fallback do template ("Olá, Líder!") é exibido.
- [ ] Invite dialog mostra botão "Enviar por email" quando há email; liderado recebe `member-welcome` com link `rhitmo.co/invite?code=...`.
- [ ] SetupChecklist mostra 5 passos, some quando todos done ou >7 dias.
- [ ] HelpCenter Slack lista os 6 comandos.
- [ ] Footer da sidebar mostra WhatsApp + SLA somente para `isBetaUser`.
- [ ] Badge no header mostra "Fundador" para beta.

## Arquivos editados

- `supabase/functions/_shared/transactional-email-templates/leader-welcome.tsx`
- `supabase/functions/_shared/transactional-email-templates/member-welcome.tsx`
- `src/components/WorkspaceOnboarding.tsx`
- `src/components/InviteMemberDialog.tsx`
- `src/components/SetupChecklist.tsx`
- `src/pages/Index.tsx`
- `src/pages/HelpCenter.tsx`
- `src/components/AppSidebar.tsx`
- `src/i18n/locales/pt-BR.json`, `en.json`, `es.json`

## Fora do escopo

P2 (landing `/founder-welcome`, check-in semanal). Sem mudança em `usePlanLimits`, `UpgradeBanner`, `Billing.tsx`, Stripe webhook, RLS, preços ou número real do WhatsApp.

