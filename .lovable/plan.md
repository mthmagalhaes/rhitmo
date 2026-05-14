## Sprints 2 e 3 — finalização

Continuação direta do que ficou pendente. Foco: ligar os componentes já criados, completar UX e fechar a resiliência com job noturno.

### Sprint 2 — UX & Error Clarity (resto)

**2.2 — Wire `AccountLoadFailed` no `App.tsx` / `AccountContext`**
- `AccountContext`: expor `loadError` e `isSlowLoad` (timer 5s).
- `App.tsx` (ou layout do líder): se `loadError` ou `isSlowLoad && !ready`, renderizar `<AccountLoadFailed onRetry={refetch} />` em vez do loader infinito.
- Telemetria: `trackFunnel('account_load_failed' | 'account_load_slow')`.

**2.3 — Persistência do wizard (Onboarding + RhitmoSync)**
- Hook `useWizardDraft(key)` que salva `{formData, currentStep}` em `localStorage` com debounce 500ms.
- Chave: `rhitmo:wizard:onboarding:${userId}` e `rhitmo:wizard:sync:${memberId}`.
- Restaurar no mount; limpar ao concluir/cancelar.
- Aplicar em `Onboarding.tsx` e `RhitmoSync.tsx`.

**2.4 — Plan limits visíveis no `NewMemberDialog`**
- Buscar `get_user_caps` (já existe) + contagem atual de liderados ativos.
- Badge no topo: `1 de 2 liderados (Pulse)`; em 100% bloquear submit + CTA "Fazer upgrade" → `/lider/configuracoes/plano`.
- Telemetria: `plan_limit_hit`.

**2.5 — Bounce visível em `/lider/pessoas`**
- Usar RPC `get_suppressed_member_emails` (já criada).
- Para cada linha com email suprimido: ícone ⚠ + Tooltip "Email não entregue (bounce). Verifique o endereço ou peça outro email."
- Botão secundário "Editar email" (abre dialog) ao lado do "Reenviar".

### Sprint 3 — Resiliência (resto)

**3.1 — Cross-device handoff em `/sync/:memberId`**
- Integrar `SyncQrHandoff` (já criado) num accordion "Continuar no celular" no topo do `RhitmoSync`.
- Esconder em viewport mobile (`md:` breakpoint).

**3.2 — `LeaderTour` resiliente**
- Substituir `setInterval` por `MutationObserver` no container do tour.
- Logs estruturados: `console.debug('[LeaderTour]', { step, found, selector })`.
- Fallback: se step não encontrado em 3s → `trackFunnel('tour_step_missing')` e pula para próximo.

**3.3 — Retry visível durante loading do `AccountContext`**
- Após 3s de loading: banner inline "Demorando mais que o normal" + botão "Recarregar".
- Após 8s: escala para `<AccountLoadFailed />` (2.2).

**3.4 — Telemetria do funil (cobertura)**
- Já temos `trackFunnel()` e tabela. Falta instrumentar pontos:
  - `auth_signup_started/completed/failed`
  - `onboarding_step_viewed/completed`
  - `sync_started/step_completed/finished`
  - `member_invited/invite_resent/invite_bounced`
  - `account_load_*`, `tour_step_missing`, `plan_limit_hit`
- Helper `withFunnel(eventType, payload)` para envolver chamadas críticas.

**3.5 — Edge function `reconcile-onboarding-state` + cron**
- `supabase/functions/reconcile-onboarding-state/index.ts`:
  - Service role.
  - Para cada `team_member` com `user_id IS NULL` e email correspondente em `auth.users`: chamar `claim_team_member_by_email`.
  - Para cada convite expirado (>14d, sem signup): marcar `invite_status='expired'` + log.
  - Logar tudo em `onboarding_reconciliation_log` (já criada).
- Cron diário 03 UTC via `supabase.insert` (pg_cron + pg_net).

### Arquivos previstos

**Novos:**
- `src/hooks/useWizardDraft.ts`
- `supabase/functions/reconcile-onboarding-state/index.ts`

**Editados:**
- `src/contexts/AccountContext.tsx` (loadError, isSlowLoad, retry)
- `src/App.tsx` (gate com AccountLoadFailed)
- `src/pages/RhitmoSync.tsx` (draft + QR handoff)
- `src/pages/Onboarding.tsx` (draft)
- `src/components/dialogs/NewMemberDialog.tsx` (plan limits)
- `src/pages/lider/Pessoas.tsx` (bounce icon + editar email)
- `src/components/LeaderTour.tsx` (MutationObserver)
- `src/lib/analytics.ts` (helper withFunnel + novos eventos)

**Migrations:**
- Nenhuma de schema. Apenas `supabase.insert` para criar o cron job de `reconcile-onboarding-state`.

### Validação pós-implementação
- Smoke manual: signup novo → onboarding → recarregar página no meio (deve restaurar).
- `NewMemberDialog` com workspace Pulse e 2 liderados → submit bloqueado.
- Forçar `loadError` no `AccountContext` (mock) → ver `AccountLoadFailed`.
- Disparar `reconcile-onboarding-state` manualmente via `curl_edge_functions` e checar `onboarding_reconciliation_log`.

### Fora de escopo
- Mudança de RLS em tabelas existentes.
- Refator de `AuthContext` além do já feito na Sprint 1.
- UI de visualização do funil (fica para sprint de analytics).
