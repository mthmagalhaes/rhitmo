

# Sprint 3 — Diferenciação Estratégica (Service-as-Software)

A Sprint 1 (cortes) e Sprint 2 (restruturação UX + fundação de notificações) estão concluídas. A Sprint 3 é onde a Rhitmo deixa de ser "ferramenta" e vira **AI-Native Leadership Partner**: automações em background que entregam outcomes sem clique do usuário.

Organizada em **3 ondas** por dependência (cron → conteúdo → distribuição):

```text
Onda 3A — Infra de automação (pré-requisito para todo o resto)
  S3.1  Cron infra (pg_cron + pg_net habilitados, scheduler edge)
  S3.2  Mirror Function (background) — detecta contradições estratégia ↔ 1:1s

Onda 3B — Conteúdo proativo (consome 3A)
  S3.3  Resumo da Semana — sexta 17h, líder + HR
  S3.4  Self-Reflection do Liderado — segunda 9h, prompt semanal
  S3.5  Alertas Proativos HR — diário, líderes em risco vira nudge automático

Onda 3C — HR Intelligence Layer
  S3.6  Heatmap comparativo entre times (engagement × tempo)
  S3.7  Export PDF Executivo Mensal (@react-pdf/renderer)
```

---

## Stories detalhadas

### S3.1 — Infra de automação (cron + scheduler)

**DB (migração):**
- Habilitar extensões `pg_cron` e `pg_net`.
- Criar tabela `automation_runs (id, job_name, started_at, finished_at, status, items_processed, error)` para observabilidade.
- Criar 4 jobs cron:
  - `mirror-weekly` → segunda 6h UTC
  - `weekly-summary` → sexta 20h UTC (17h BRT)
  - `self-reflection` → segunda 12h UTC (9h BRT)
  - `hr-risk-alerts` → diário 11h UTC (8h BRT)
- Cada cron faz `net.http_post` para a edge function correspondente com `service_role_key` no header.

**Edge function comum:** `_shared/cronAuth.ts` valida header `x-cron-secret` para evitar invocação externa.

---

### S3.2 — Mirror Function

A feature mais distintiva do produto (já no project knowledge: "AI acts as Chief of Staff, detecting contradictions").

**Lógica:**
- Para cada líder ativo, comparar:
  - `meeting_transcripts` da última semana (notas de 1:1) → temas dominantes via tags + texto.
  - `goals` ativos do time (estratégia declarada) → temas declarados.
- Se desvio > 30% (ex: prioridade declarada "shipping de feature X", mas 50% dos 1:1s falaram de processo interno), gerar Mirror Insight.

**DB:**
- Tabela `mirror_insights (id, manager_id, week_starting, summary, contradiction_score, evidence jsonb, dismissed_at, created_at)`.
- RLS: leitura/escrita só para o próprio `manager_id`.

**Edge function:** `mirror-weekly/index.ts`
- Itera líderes ativos no workspace.
- Chama Lovable AI Gateway (`google/gemini-2.5-flash` para custo baixo) com prompt estruturado pedindo JSON.
- Insere em `mirror_insights`.
- Cria registro em `leader_nudges` com `nudge_type='mirror_insight'`.

**Frontend:**
- Card no dashboard do líder (`Index.tsx`, acima do SmartInbox quando houver insight ativo).
- "Ver detalhes" abre Sheet com evidências (notas citadas).
- Botão "Reconhecer" → marca `dismissed_at`.

---

### S3.3 — Resumo da Semana automático

**Edge function:** `weekly-summary/index.ts`
- Para cada líder com pelo menos 1 nota na semana:
  - Agrega: # notas criadas, # 1:1s realizados, # liderados ativos, top 3 temas (via tags), 1 highlight (nota mais rica), 1 alerta (liderado sem nota há 14d+).
  - Renderiza com Lovable AI um resumo curto em markdown.
- Para cada HR Admin:
  - Agrega Health Score atual + delta vs semana anterior + top 3 líderes em risco.
- Distribui via `_shared/notifications.ts` (já criado em S2.3) respeitando `user_notification_preferences.weekly_summary`.

**Email template:** `weekly-summary.tsx` em `_shared/transactional-email-templates/` (segue padrão Lora/Inter já existente).

**Slack:** se canal preferido for slack, posta em DM via `slack-bot`.

---

### S3.4 — Self-Reflection Prompt do Liderado

**Edge function:** `self-reflection/index.ts`
- Toda segunda 9h BRT, para cada `team_member` linked + ativo:
  - Verifica preferência `user_notification_preferences.self_reflection` (default `in_app`).
  - Cria entrada em `member_prompts (id, member_id, prompt_text, week_starting, answered_at, response)` com 1 pergunta rotativa de uma lista curada (8 prompts: "Qual sua maior energia da semana?", "O que está te drenando?", etc.).
  - Despacha por canal preferido.

**DB:** nova tabela `member_prompts` + RLS (só o próprio member lê/escreve).

**Frontend:**
- Card "Reflexão da semana" no `DirectReportDashboard.tsx` quando houver prompt sem resposta.
- Resposta vai para `member_prompts.response` + opcionalmente vira nota privada do líder marcada como `source='self_reflection'`.

---

### S3.5 — Alertas Proativos HR (Líderes em Risco → Nudge)

A RPC `get_leaders_at_risk` (S2.5) já existe. Atualmente é consumida apenas no dashboard. Em S3.5:

**Edge function:** `hr-risk-alerts/index.ts`
- Diário 8h BRT, varre todos os workspaces.
- Para cada líder em risco há 3 dias consecutivos:
  - Cria `leader_nudges` com `nudge_type='hr_auto_alert'`.
  - Notifica HR Admins via canal preferido (`hr_alerts`).
- Dedupe: não cria 2 alertas para o mesmo líder na mesma semana (campo `metadata.week_starting`).

**Frontend:**
- Badge no menu HR quando houver alertas não vistos.
- Listagem dedicada em nova seção `/hr` "Alertas automáticos" (acima de `LeadersAtRiskTable`).

---

### S3.6 — Heatmap Comparativo entre Times

**DB:** RPC `get_workspace_engagement_heatmap(_workspace_id)` retorna matriz time × semana (últimas 12) com score 0-100 (mix de cobertura + recency + PDI ativo).

**Frontend:** componente `src/components/hr/EngagementHeatmap.tsx`
- Reusa `recharts` ou matriz CSS simples (12 colunas × N times).
- Cor: verde-amarelo-vermelho segundo a regra 7/14 de health status (memo `mem://features/team-management/health-status-logic`).
- Posiciona em `HRDashboard.tsx` ou `HRAnalytics.tsx`.

---

### S3.7 — Export PDF Executivo Mensal

**Pacote:** `@react-pdf/renderer` (instalar).

**Edge function:** `generate-monthly-report/index.ts`
- Gera PDF para o workspace com:
  - Capa (logo Rhitmo + workspace name + mês).
  - Health Score + sparkline 4 semanas.
  - Cobertura por time.
  - Top 5 liderados em risco.
  - Top 3 mirror insights do mês.
  - Apêndice: matriz de cobertura.
- Salva em `storage` bucket `monthly-reports` (privado, RLS por workspace).

**Frontend:**
- Botão "Exportar PDF do mês" em `/hr` (HR Admin only).
- Lista de relatórios anteriores.

**Cron opcional:** dia 1 de cada mês gera automaticamente para todos os workspaces.

---

## Observações técnicas críticas

- **Custo de IA** (memo `mem://monetization/modelo-economico-e-margens-abril-2026`): Mirror Function e Resumo Semanal usam `google/gemini-2.5-flash` (NÃO Pro) para preservar margem. Apenas geração de PDF executivo pode usar `gemini-2.5-pro` se precisar de síntese mais sofisticada.
- **Constituição Rhitmo**: toda edge function de IA importa `_shared/rhitmo-constitution.ts`.
- **Anti-alucinação**: Mirror cita evidências específicas (IDs de notas), nunca generaliza.
- **i18n**: todas strings novas em PT-BR, EN, ES (`mirror.*`, `weeklySummary.*`, `selfReflection.*`, `hrAlerts.*`, `heatmap.*`, `monthlyReport.*`).
- **RLS**: `mirror_insights`, `member_prompts`, `automation_runs` — todas com policies estritas via `effective_user_id()`.
- **Cron secret**: novo secret `CRON_SECRET` precisa ser solicitado ao usuário antes do deploy das edge functions.

## Ordem de execução

1. **S3.1** (cron infra + secret) — bloqueador de tudo.
2. **S3.2** (Mirror) — feature mais distintiva, foco da semana.
3. **S3.3** (Resumo semanal) — usa infra de notificações já pronta.
4. **S3.4** (Self-reflection) — paralelo a 3.3.
5. **S3.5** (Alertas proativos HR) — usa RPC já criada.
6. **S3.6** (Heatmap) — UI puro, fácil.
7. **S3.7** (PDF Export) — encerramento, pacote externo.

## Critério de "Sprint 3 concluída"

- ✅ 4 jobs cron rodando e logados em `automation_runs`.
- ✅ Mirror Function gera ao menos 1 insight válido em workspace de teste com dados reais.
- ✅ Resumo da Semana entregue por email + Slack respeitando preferências.
- ✅ Self-reflection prompt aparece no dashboard do liderado segunda de manhã.
- ✅ Heatmap renderiza para HR Admin.
- ✅ PDF mensal baixável e visualmente alinhado ao Brand Kit (Lora/Inter, RhythmWave).
- ✅ Linter Supabase sem novos warnings críticos.
- ✅ Typecheck passa sem erros.

