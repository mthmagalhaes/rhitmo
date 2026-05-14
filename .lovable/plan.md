# Verificação rápida + Sprints 2 e 3

## ✅ Verificação do Sprint 1

Conferi o estado atual:
- `AuthContext.tsx` com auto-claim por e-mail rodando em `SIGNED_IN/INITIAL_SESSION/USER_UPDATED` ✅
- `RhitmoSync.tsx` com gating "Não vinculado" + CTAs criar conta/entrar ✅
- `Auth.tsx` com switch automático para login quando e-mail já existe ✅
- `Pessoas.tsx` com botão Reenviar ✅
- Migrations `claim_team_member_by_email` + trigger "Sem Time" + `get_member_for_sync.email` aplicadas ✅
- Logs de auth (12:54Z) e dev-server limpos, sem erros ✅
- Console do preview: só `Auth event: SIGNED_IN/INITIAL_SESSION` (esperado)

Nada quebrou. Posso seguir para Sprints 2 e 3.

---

## Sprint 2 — UX e clareza de erro

Foco: parar de perder usuário em mensagens crípticas e em estados ambíguos.

### 2.1 Banner "E-mail não confirmado" com CTA reenviar
- Em `Auth.tsx`, quando login falhar com `Email not confirmed`, mostrar bloco persistente (não toast) com:
  - Texto "Confirme seu e-mail. Não chegou?"
  - Botão **Reenviar verificação** → `supabase.auth.resend({ type: 'signup', email })`
  - Cooldown de 60s no botão (state local) + toast de confirmação.

### 2.2 ErrorBoundary visível no AccountContext
- Hoje `AccountContext.hasError = true` deixa o app em branco.
- Criar componente `<AccountLoadFailed />` (Card centralizado, tom Creme/Bento) com:
  - Título "Não conseguimos carregar sua workspace"
  - Botões **Tentar de novo** (`refetchWorkspace()`) e **Falar com suporte** (mailto/Slack help).
- Em `App.tsx` (ou onde renderiza rotas autenticadas), gate `if (account.hasError) return <AccountLoadFailed />`.

### 2.3 Persistir wizard do liderado em localStorage
- `RhitmoSync.tsx` e `Onboarding.tsx`: salvar `formData + currentStep` em `localStorage` por `memberId`/`userId` a cada mudança.
- Hidratar no mount; limpar ao concluir com sucesso.
- Sobrevive a reload, troca de aba e back/forward do navegador (item #27 do audit).

### 2.4 Indicador visível de limite de plano no NewMemberDialog
- Buscar contagem atual (`useEnforcedLimits` já existe) e mostrar badge no topo do dialog: **"1 de 2 liderados (Pulse)"**.
- Quando atingir o teto, desabilitar submit e mostrar CTA "Fazer upgrade" → `/lider/configuracoes?tab=plano`.

### 2.5 Bounce de e-mail visível na lista
- `handle-email-suppression` já popula `suppressed_emails`.
- Em `/lider/pessoas`, ao listar membros, fazer join leve e mostrar ícone ⚠ "E-mail rejeitou — atualize o endereço" no card do liderado afetado, com tooltip explicando.

---

## Sprint 3 — Resiliência

Foco: fechar caminhos exóticos e ter telemetria pra parar de descobrir bug por DM.

### 3.1 Cross-device handoff no `/sync/:memberId`
- Detectar viewport mobile + usuário não logado.
- Mostrar QR code (lib `qrcode.react`) com URL atual + botão "Continuar neste celular".
- Útil quando líder envia link e liderado abre no notebook do trabalho mas quer responder no celular.

### 3.2 LeaderTour resiliente
- `LeaderTour.tsx` já usa `waitForSelector` (bom). Adicionar:
  - `MutationObserver` em vez de polling fixo (mais rápido, menos custoso em mobile).
  - Fallback claro quando passo cair: toast já existe, manter; adicionar log estruturado pra telemetria.

### 3.3 Retry visível no AccountContext
- Complementa 2.2: enquanto carregando >5s, mostrar "Demorando mais que o normal — [Recarregar]" inline no skeleton, não só na tela de erro definitiva.

### 3.4 Telemetria de funil de onboarding
- Tabela `onboarding_funnel_events` (event_type, user_id, workspace_id, member_id, payload jsonb, created_at).
- Eventos disparados via `lib/analytics.ts` (já existe):
  - `leader_signup_started`, `leader_signup_completed`, `workspace_created`, `first_member_invited`, `first_invite_sent`, `member_sync_started`, `member_sync_completed`, `member_account_linked`.
- View materializada `funnel_daily` para HR Admin futuro acompanhar drop-offs.

### 3.5 Job noturno de reconciliação
- Edge function `reconcile-onboarding-state` + cron diário (03 UTC):
  - Workspaces sem nenhum team → cria "Sem Time".
  - `team_members` com `email` mas sem `linked_user_id` cujo e-mail bate em `auth.users` → roda `claim_team_member_by_email`.
  - Convites `pending` há >14 dias → marca `expired` e notifica líder via Slack DM (reusa orchestrator).
  - Loga resumo em `onboarding_reconciliation_log` pra audit.

---

## Sequência sugerida de entrega

```text
Sprint 2 (1ª PR)        Sprint 3 (2ª PR)
─────────────────       ─────────────────
2.1 Reenviar verif.     3.4 Telemetria funil  ← dá visibilidade pra resto
2.2 ErrorBoundary       3.3 Retry visível
2.3 Persist wizard      3.1 QR cross-device
2.4 Limite plano        3.2 LeaderTour MutObs
2.5 Bounce visível      3.5 Job reconciliação
```

## Detalhes técnicos relevantes

- **Migrations novas**: 1 para `onboarding_funnel_events` (RLS: leitura HR Admin/Super Admin; insert via service role na edge), 1 para `onboarding_reconciliation_log`.
- **Edge functions novas**: `reconcile-onboarding-state` (cron, service role).
- **Cron**: agendar via `pg_cron` + `pg_net` chamando a edge com `apikey` (padrão do projeto).
- **Dependências novas**: `qrcode.react` (~3KB) só para 3.1.
- **Sem mudança em RLS existente** das tabelas críticas (`team_members`, `workspaces`, `feedback`); apenas leitura adicional.
- Reutilizar `safeRpc/tryRpc/safeFunctionInvoke` em todas as chamadas novas (memo Safe Supabase Wrappers).
- i18n: textos novos vão para `pt-BR.json/en.json/es.json` (não hard-codar).

Aprova esse escopo (Sprint 2 + Sprint 3 completos) ou prefere começar só pelo Sprint 2 e revalidar antes do 3?
