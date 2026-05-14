
# Auditoria do "primeiro contato" — Líder & Liderado

Mapeei toda a malha de entrada da plataforma web (signup → workspace → convite → sync → primeiro uso) e listo abaixo cada caminho que pode falhar hoje, ordenado por **probabilidade de acontecer x dor pro usuário**. No fim, plano de correção priorizado.

---

## Parte 1 — Jornada do LÍDER (primeira experiência)

### Caminho feliz esperado
`Landing → /auth/start → /auth?persona=leader → signup (email ou Google) → email de verificação → /dashboard → WorkspaceOnboarding modal → cria workspace + team "Sem Time" → /lider/inicio → LeaderTour → adiciona 1º liderado`

### Pontos de falha identificados

**A. Signup / Auth**
1. **Email não verificado, mas usuário tenta logar** — Auth.tsx só mostra `error.message` cru do Supabase ("Email not confirmed"). Sem CTA pra reenviar verificação.
2. **OAuth Google em popup bloqueado** ou usuário fecha aba durante round-trip — `signup_persona` fica órfão no localStorage e na próxima sessão força fluxo errado.
3. **Senha fraca / HIBP rejeita** — mensagem genérica do Supabase, sem orientação.
4. **Usuário cria conta com email que já existe** — Supabase responde "User already registered" sem oferecer "ir pra login".
5. **Race condition do `signup_persona`** — se localStorage está bloqueado (Safari modo privado/iOS), persona se perde, líder cai como `user` e vê tela vazia.

**B. WorkspaceOnboarding (modal pós-signup)**
6. **Usuário fecha aba antes de criar workspace** — fica num estado limbo: `auth.users` existe, sem workspace, sem team, sem role. Próximo login: o heuristic `baseNeedsWorkspaceSetup` reabre o modal, **mas se `signup_persona` foi limpo**, o modal não abre se RLS retornar erro temporário (`hasError` true).
7. **Workspace criado, mas insert do team "Sem Time" falha** (RLS/trigger) — workspace órfão, modal não reabre porque já tem `workspaceId`. Líder cai em `/lider/inicio` sem time → quebra fluxo de adicionar membro.
8. **Email `leader-welcome` falha silenciosamente** — só log, OK, mas líder nunca recebe boas-vindas e perde o link do dashboard.
9. **`assigned_plan` ausente em metadata** — fallback pra `pulse`, mas se o usuário pagou Pro via checkout antes (caso `plan=pro`), pode ficar com plan errado até webhook do Stripe rodar.

**C. Primeiro `/lider/inicio` e Tour**
10. **LeaderTour dispara antes do DOM estar pronto** — anchor `data-tour="sidebar"` só existe no header mobile (lg:hidden). Em desktop, tour pode quebrar no primeiro passo.
11. **AccountContext em `loading` por >5s** (RPC `get_account_context` lenta/falha) — `isLeader` fica forçado true durante loading, mas dashboard fica em skeleton infinito se RPC retornar `hasError`.
12. **`hasError` no AccountContext + sem retry visível** — usuário vê app vazio sem mensagem clara; só refresh manual resolve.

**D. Adicionar primeiro liderado (NewMemberDialog)**
13. **Sem time pré-selecionado** — se trigger de criação do "Sem Time" falhou (B-7), bloqueia o líder com "Time obrigatório".
14. **Email `member-welcome` (com syncUrl) falha** — toast mostra erro mas membro **já foi criado** no DB. Líder não sabe o que fazer; precisa reenviar manualmente (não há botão "reenviar convite" óbvio na lista).
15. **Limite de plano (Pulse = 2 liderados)** — `enforceLimit` bloqueia, mas líder não vê de antemão (counter desabilitado/visível?). Frustrante na 3ª tentativa.
16. **Stripe sync silencioso** — `syncStripeSeats()` fire-and-forget; se cobrar errado, líder só descobre na fatura.
17. **Email ilícito/typo do liderado** — convite vai pra inbox errada; sem feedback de bounce no líder (precisa do `handle-email-suppression` mostrar de volta na UI).

**E. Convite via link `/invite?code=...`**
18. **Link expirado/já usado por OUTRO usuário** — `get_invite_status` retorna `already_accepted` mas com `linked_user_id` ≠ user.id → tela mostra "já aceito" sem explicar que foi por outra pessoa. Líder/RH não tem como invalidar e reenviar.
19. **Usuário logado em conta errada** abre o link — auto-aceita pra conta errada (sem confirmação).
20. **Token sem `code` nem `token` no querystring** — cai em `not_found` direto, sem dica de "fale com seu líder".

---

## Parte 2 — Jornada do LIDERADO (primeira experiência)

### Caminho feliz esperado
`Email member-welcome → clica syncUrl `/sync/:memberId` → preenche wizard → cria conta → /onboarding (job crafting) → /liderado/inicio`

### Pontos de falha identificados

**F. Antes de criar conta**
21. **Liderado abre `/sync/:memberId` sem estar logado** — RhitmoSync hoje exige `linked_user_id === user.id` antes de submeter. Mostramos tela "Falta ativar sua conta" (correção recente Ana/Ruan), **mas o liderado pode preencher 4 steps inteiros e só descobrir no fim** se o gating não disparar (caso o member ainda não tem `linked_user_id` definido = igual a null no objeto user → bug do caso Ruan).
22. **Liderado clica no link em outro device/email** — não há cross-device handoff; nem QR code.
23. **`syncUrl` passou pelo Outlook safelink/Gmail proxy** — token pode ser pré-clicado por bot anti-phishing e marcar como "já visualizado".

**G. Criação de conta do liderado**
24. **Liderado cria conta com email diferente do que recebeu o convite** — RPC de aceite do invite (`team_members.update where invite_token = code`) só funciona via `/invite`, mas o `member-welcome` envia direto pro `/sync/:memberId` (sem invite_token). Resultado: conta criada nunca fica `linked_user_id`. **Esse é o bug raiz do caso Ruan.**
25. **Liderado já tem conta noutro workspace** — `useLinkedMember` ownerCheck/leaderCheck pode retornar dado errado e tratar como "não é liderado".
26. **Email confirmação cai em spam** — bloqueia tudo silenciosamente.

**H. Onboarding do liderado (`/Onboarding`)**
27. **Liderado pula etapas via back/forward do navegador** — wizard não persiste estado parcial; recarrega zera tudo.
28. **`skills_data` parcial** — se gravou step 2 mas falhou no step 3, `onboarding_completed` fica false e DirectReportGuard reabre o wizard sem warning.
29. **AI analysis (`analyze-job-crafting`) falha/timeout** — onboarding finaliza mas `ai_analysis` vem null; Compass do liderado abre sem insights.
30. **Linked-member RLS lag** — após aceitar convite, `useLinkedMember` precisa de até 5 retries com backoff. Em rede móvel ruim, liderado vê "Carregando..." infinito.

**I. Primeiro acesso pós-onboarding**
31. **`/liderado/inicio` sem dados do líder** (líder não preencheu LeaderSync) — Compass quebra ou mostra cards vazios sem CTA.
32. **Liderado é desvinculado do time** (líder removeu/transferiu) — sem mensagem clara, vira fantasma.

---

## Parte 3 — Falhas transversais (pegam ambos os perfis)

33. **`PGRST` (RLS recursão)** em `get_account_context` — telas brancas; `hasError` true mas UI não tem boundary visível.
34. **Sessão zumbi** ("Refresh Token Not Found") — já tratado (`auth-session-zombie-protection`), mas em mobile/PWA pode dar loop.
35. **Multi-aba** — login em uma aba não invalida estado da outra; pode causar duplo workspace creation.
36. **Domínio errado** (acessar `app-rhitmo.lovable.app` vs `rhitmo.co`) — emails/redirects assumem `rhitmo.co`; OAuth callback pode bloquear.
37. **Idioma mismatch** — i18n cai pro PT-BR mas usuário es/en pode receber email em PT.

---

## Plano de correção (ordenado por ROI)

### Sprint 1 — Bloqueadores críticos (essa semana)

**1. Vincular conta do liderado quando criada via `/sync/:memberId`**
   - Hoje `member-welcome` manda direto pro `/sync/:memberId` (sem invite_token).
   - Adicionar fallback: se usuário criar conta com email igual ao `team_members.email`, RPC `claim_team_member_by_email(p_user_id)` faz match e seta `linked_user_id` automaticamente.
   - Trigger pós-signup chama essa RPC. Resolve raiz do caso Ruan.

**2. Tela "convite quebrado" amigável em RhitmoSync (hardening)**
   - Já fizemos gating no início. Adicionar: se `notLinked`, oferecer botão "Criar conta com este email" que pré-preenche `/auth?mode=signup&email=...`.

**3. Detectar email já registrado em `Auth.tsx`**
   - Trocar mensagem genérica por "Você já tem conta. [Entrar]" com switch automático pra modo login.

**4. Garantir team "Sem Time" sempre existir**
   - Trigger `after insert on workspaces` cria o team default. Migra workspaces órfãos hoje.
   - Backfill: query `SELECT workspaces sem teams` e corrige.

**5. Botão "Reenviar convite" na lista de membros (`/lider/pessoas`)**
   - Endpoint reusa `send-transactional-email` com mesmo `idempotencyKey + suffix v2`.
   - Mostra status do último envio (enviado/bounce/aceito).

### Sprint 2 — UX e clareza de erro (próxima semana)

**6. Toast/banner "Email não confirmado" com CTA reenviar** no Auth.
**7. ErrorBoundary no AccountContext** — quando `hasError`, mostrar tela "Não conseguimos carregar seu workspace. [Tentar de novo] [Falar com suporte]".
**8. Persistir wizard do liderado no localStorage** (steps + dados) — sobrevive a reload.
**9. Indicador visível de limite de plano no NewMemberDialog** — "1 de 2 liderados (Pulse)" antes de submeter.
**10. Rastrear bounces de email** — `handle-email-suppression` já existe; expor no UI do líder ("⚠ email do João voltou").

### Sprint 3 — Resiliência

**11. Cross-device handoff** — `/sync/:memberId` mostra QR code se viewport mobile pequeno e usuário não logado.
**12. LeaderTour** — esperar `MutationObserver` confirmar elementos, fallback se anchor sumiu.
**13. Retry visível no AccountContext** — botão manual em vez de só backoff silencioso.
**14. Telemetria de funil** — eventos `leader_signup_started/workspace_created/first_member_added/first_sync_completed` pra medir drop-offs reais.
**15. Job de reconciliação noturno** — detecta workspaces sem team, members sem invite_status válido, `linked_user_id` órfão; auto-corrige ou alerta admin.

---

## Sugestão de próximo passo

Posso começar pelos itens 1–5 (Sprint 1 — bloqueadores) que destravam casos como o do Ruan e fecham as portas mais perigosas. Aprova esse escopo ou quer reordenar?
