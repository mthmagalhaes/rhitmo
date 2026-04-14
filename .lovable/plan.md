

## Plano: Implementar Melhorias da Jornada de E-mails

### Resumo

Implementar os 4 GAPs identificados na analise de jornada: (1) email de confirmacao para leads da waitlist, (2) envio de member-welcome no cadastro manual, (3) welcome email no signup self-service, e (4) notificacao ao lider quando sync e completado.

---

### GAP 1 — Email de confirmacao para o Lead (Prioridade Alta)

**Template novo:** `waitlist-confirmation`

Criar `supabase/functions/_shared/transactional-email-templates/waitlist-confirmation.tsx` com:
- Assunto: "Voce esta na fila! Seu lugar no Rhitmo esta garantido"
- Conteudo: confirmacao de entrada na waitlist, proposta de valor, expectativa de prazo
- Branding consistente com os demais templates

**Registrar** no `registry.ts`.

**Wiring:** Adicionar chamada em `WaitlistDialog.tsx` apos insert com sucesso, fire-and-forget para o email do lead.

---

### GAP 2 — Member-welcome no cadastro manual (Prioridade Media)

**Arquivo:** `src/components/NewMemberDialog.tsx`

Atualmente, quando `sendDiscInvite` esta ativo, so envia `sync-invite`. Ajustar para:
1. Sempre enviar `member-welcome` (apresentacao do Rhitmo, com nome do lider e link do sync)
2. Remover o envio separado de `sync-invite` nesse fluxo (o member-welcome ja inclui o CTA do sync)

Isso garante que liderados cadastrados manualmente recebam a mesma apresentacao contextualizada que os de bulk-onboard.

---

### GAP 3 — Welcome email no signup self-service (Prioridade Media)

**Arquivo:** `src/components/WorkspaceOnboarding.tsx`

Apos criar workspace com sucesso, disparar `leader-welcome` para o proprio usuario logado (que acabou de criar o workspace = e lider). Fire-and-forget com dados do workspace e dashboard URL.

---

### GAP 4 — Notificacao "Sync completado" para o lider (Prioridade Media)

**Template novo:** `sync-completed`

Criar `supabase/functions/_shared/transactional-email-templates/sync-completed.tsx` com:
- Assunto: "[Nome] completou o Rhitmo Sync!"
- Conteudo: notificar o lider que o liderado completou, com CTA para ver o perfil
- Branding consistente

**Registrar** no `registry.ts`.

**Wiring:** Em `src/pages/RhitmoSync.tsx`, apos `submit_rhitmo_sync_v2` retornar sucesso, buscar dados do member (nome, team, leader email) e disparar fire-and-forget para o email do lider. Precisaremos de uma query adicional para obter o email do lider (via team -> leader_user_id -> auth.users). Alternativa mais segura: criar uma DB function `get_sync_notification_data(member_id)` SECURITY DEFINER que retorna leader_email, leader_name, member_name.

---

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/_shared/transactional-email-templates/waitlist-confirmation.tsx` | **Novo** |
| `supabase/functions/_shared/transactional-email-templates/sync-completed.tsx` | **Novo** |
| `supabase/functions/_shared/transactional-email-templates/registry.ts` | Adicionar 2 imports |
| `src/components/WaitlistDialog.tsx` | Adicionar envio `waitlist-confirmation` |
| `src/components/NewMemberDialog.tsx` | Trocar `sync-invite` por `member-welcome` |
| `src/components/WorkspaceOnboarding.tsx` | Adicionar envio `leader-welcome` |
| `src/pages/RhitmoSync.tsx` | Adicionar envio `sync-completed` ao lider |

**Migracao SQL:** Criar function `get_sync_notification_data(member_id)` para buscar email do lider de forma segura.

**Deploy:** `send-transactional-email` (recompila com novos templates no registry).

