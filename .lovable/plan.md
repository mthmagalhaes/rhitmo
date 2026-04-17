## Diagnóstico

Modelo é **Workspace = Empresa** (1 workspace, múltiplos líderes via `teams.leader_user_id`). O `plan_tier` fica no workspace; o `is_beta_user` dá Infinity (não queremos isso aqui — eles têm trial limitado de 2 meses, depois pagam). A tabela `subscriptions` tem `trial_ends_at` e `status='trialing'` perfeitos pra registrar o acordo.

`usePlanLimits` lê apenas `workspaces.plan_tier` para liberar features, então setar `plan_tier='pro'` já libera acesso Pro durante o trial. A `subscriptions` row serve como controle de quando cobrar.

## Plano

### Passo 1 — Criar workspace FAP via migration

- Nome: **"FAP - Faculdade Baixo Parnaíba"**
- `plan_tier = 'pro'`
- `is_beta_user = false` (têm trial, não são beta vitalício)
- `client_account = 'FAP'`, `customer_segment = 'trial'`
- `owner_id = NULL` temporariamente (será setado após o primeiro líder aceitar o convite e ser identificado — ou já apontamos pro Mateus se ele criar conta primeiro). Como `owner_id` é NOT NULL, vou apontar pro seu user (`matheus@rhitmo.co`) como owner técnico inicial; depois você transfere via UI Admin → Estrutura quando o `direcaoacademica@fapeduca.com.br` aceitar o convite.

### Passo 2 — Criar registro de subscription com trial

- `workspace_id` = FAP
- `plan_tier = 'pro'`
- `status = 'trialing'`
- `trial_ends_at = now() + interval '60 days'` (≈ 2 meses)
- `current_period_end = now() + interval '60 days'`

Isso fica como **registro de auditoria** do acordo. Quando o trial expirar, eles precisarão fazer checkout via Stripe (que substitui essa row).

### Passo 3 — Bulk onboard via UI existente

Você baixa o template no `/admin → Usuários → Importar em Massa` e usa este CSV (já formatado pra colar):

```csv
email,nome,papel,workspace,time,lider_email
mateus@fapeduca.com.br,Mateus (RH FAP),hr_admin,FAP - Faculdade Baixo Parnaíba,,
direcaoacademica@fapeduca.com.br,Direção Acadêmica,leader,FAP - Faculdade Baixo Parnaíba,Direção Acadêmica,
coord.ciencias_contabeis@fapeduca.com.br,Coord. Ciências Contábeis,leader,FAP - Faculdade Baixo Parnaíba,Ciências Contábeis,
coord.cursodireito@fapeduca.com.br,Coord. Direito,leader,FAP - Faculdade Baixo Parnaíba,Direito,
coord.enfermagem@fapeduca.com.br,Coord. Enfermagem,leader,FAP - Faculdade Baixo Parnaíba,Enfermagem,
coord.fisioterapia@fapeduca.com.br,Coord. Fisioterapia,leader,FAP - Faculdade Baixo Parnaíba,Fisioterapia,
coord.pedagogia@fapeduca.com.br,Coord. Pedagogia,leader,FAP - Faculdade Baixo Parnaíba,Pedagogia,
rosimar.santos2021@outlook.com,Rosimar Santos,leader,FAP - Faculdade Baixo Parnaíba,Time da Rosimar,
```

O `bulk-onboard` vai:

- Convidar cada email (Supabase manda email de convite + welcome email customizado por papel)
- Criar 1 time por líder, já com `leader_user_id` correto
- Adicionar Mateus como HR Admin do workspace via RPC `manage_hr_admin`

> Nota sobre Rosimar: é o único email não-corporativo. Confirmar nome do time real dela antes de importar (placeholder "Time da Rosimar").

### Passo 4 — Lembrete operacional

Criar um nudge/lembrete no calendário pra **30 dias antes do trial expirar** (≈ 30 dias após hoje) avisando o Mateus pra acionar o checkout. Como o sistema ainda não tem cron pra trial-expiry, isso fica manual por enquanto. Posso adicionar isso depois se quiser.

## Arquivos a criar/modificar

- **1 migration SQL** (~25 linhas) criando workspace + subscription trialing + log no `admin_impersonation_audit` opcionalmente.
- **Zero código TS modificado.** Todo o resto usa o fluxo existente (`/admin → Importar em Massa`).

## Por que NÃO usar `is_beta_user=true`

`is_beta_user` dá limites Infinity vitalícios (memória `plan-limits-and-guardrails-v2`). Eles têm acordo comercial: 2 meses grátis → depois pagam. Setar `is_beta_user=true` esconderia o paywall e dificultaria a cobrança no fim do trial. Usar `plan_tier='pro' + subscriptions.trialing` é o caminho correto e auditável.

## Validação após execução

1. Workspace "FAP - Faculdade Baixo Parnaíba" aparece em `/admin → Estrutura` com badge "Pro" e segmento "Trial"
2. Subscription `trialing` aparece em `/admin → Inteligência` (contador de tiers)
3. Bulk onboard reporta 8 sucessos (1 HR + 7 líderes)
4. Mateus aparece como HR Admin do workspace
5. Cada líder recebe email de boas-vindas + convite Supabase

## Próximas perguntas antes de aprovar

1. **Owner inicial do workspace**:  deixe o Mateus (HR Admin) como owner desde o início (Impacto: owner tem permissão total; HR Admin já tem acesso quase equivalente)
2. **Time da Rosimar**: vamos subir com um nome generico e o usuário edita depois que entrar na plataforma.
3. **Trial = 60 dias corridos** a partir de segunda (≈ 20/jun/2026), ok?