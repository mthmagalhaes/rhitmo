

# Sprint 2 — Restruturação UX (8 stories)

A Sprint 1 está concluída. A Sprint 2 é maior e mais arriscada que a 1. Vou organizar em **2 ondas internas** para reduzir risco de regressão e respeitar a regra de "S2.3 é pré-requisito do Sprint 3".

```text
Onda 2A — fundação e UI (executar primeiro)
  S2.3  Settings de Notificações + tabela DB
  S2.1  MemberDetails: 3 abas (Pessoa / Histórico / Performance)
  S2.6  Quebrar Rhitmo Sync em microsteps com auto-save
  S2.7  SkillsMap → radar visual

Onda 2B — features novas com queries
  S2.2  Smart Inbox no dashboard do líder
  S2.4  Time Health Score como hero do /hr
  S2.5  Líderes em risco (HR)
  S2.8  Liderado: "Pedir conversa" → nudge real
```

---

## Stories detalhadas

### S2.3 — Settings de Notificações (FAZER PRIMEIRO)

**DB (migração):**
```sql
create table public.user_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notification_type text not null,  -- 'weekly_summary' | 'pdi_milestone' | 'self_reflection' | 'hr_alerts' | 'member_request_1on1' | 'ai_pattern'
  channel text not null default 'in_app', -- 'off' | 'in_app' | 'email' | 'slack'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, notification_type)
);
alter table public.user_notification_preferences enable row level security;
create policy "users manage own prefs" on public.user_notification_preferences
  for all using (user_id = effective_user_id())
  with check (user_id = effective_user_id());
```

**Frontend:**
- Nova aba "Notificações" no `ProfileSettingsDialog.tsx` (Tabs).
- Hook `src/hooks/useNotificationPreferences.ts` — `get(type)` + `set(type, channel)`.
- Helper edge `_shared/notifications.ts` — `getPreferredChannel(userId, type)` para o Sprint 3.
- i18n nos 3 idiomas (`settings.notifications.*`).

**Aceite:** usuário vê toggles e troca canal; valor persiste; HR vê toggle "Alertas HR" (oculto para Líder/Liderado).

---

### S2.1 — MemberDetails em 3 abas

**Antes:** Accordion com Sync / Skills / Goals / Feedbacks / Reuniões / Reviews / PDI.

**Depois:** `<Tabs>` horizontais sticky:
- **Pessoa** — Rhitmo Sync + Career Compass (SkillsMap) + User Manual + Workstyle.
- **Histórico** — Filtros + FeedbackTimeline + (futuras) Reuniões.
- **Performance** — PDI (GoalsManager) + PerformanceReviewList + (S3.2) Mirror placeholder.

Deep link `?tab=performance` via `useSearchParams`. Manter scroll interno; manter botões header.

**Arquivo:** `src/pages/MemberDetails.tsx` (reescrita do bloco a partir da linha ~250 onde começa o accordion).

---

### S2.6 — Quebrar Sync (Liderado) em 3 microsteps com auto-save

`LeaderSyncWizard.tsx` já é wizard de 4 passos para Líderes — mantém. O dialog do **liderado** (em `DirectReportDashboard.tsx`, dialog "Rhitmo Sync") é o wall-of-form a refatorar.

**Mudanças:**
- Novo `src/components/MemberSyncWizard.tsx` em 3 steps: **Ritmo** (chronotype) → **Motivadores** (energizers / drainers / recognition) → **User Manual** (preferências + feedback).
- `useEffect` debounced (1.5s) chama `update team_members set chronotype/motivators/user_manual` parcial.
- Substituir o dialog gigante atual por este wizard.

---

### S2.7 — SkillsMap radar memorável

`SkillsMapCard.tsx` atualmente mostra texto + lista de gaps/focus. Refator:
- Acima do resumo, adicionar **RadarChart** (`recharts`, já no projeto via `chart.tsx`) com 5 eixos derivados: Alinhamento (do `alignment_score`), Execução, Comunicação, Aprendizado, Liderança — derivados das tags agregadas das notas dos últimos 90d via uma RPC nova `get_member_skill_radar(_member_id)`.
- Hover tooltip mostra evidências (notas que contribuem para o eixo).
- Fallback gracioso: se não houver dados de tags, mostra apenas Alinhamento + texto atual.

**Arquivos:** `SkillsMapCard.tsx` + migração com RPC.

---

### S2.2 — Smart Inbox no dashboard do líder

Substitui o `SetupChecklist` (após D7) e fica acima do TeamTabs.

**Card "Hoje você tem":**
- `X 1:1s hoje` — query `meeting_transcripts` ou `calendar_events` com data=hoje e leader=user.
- `Y liderados sem nota há 14d` — agrupar `feedbacks` por `member_id` MAX(occurred_at) onde manager=user.
- `Z reviews aguardando envio` — `performance_reviews` status=`draft` do leader.
- `W nudges pendentes` — `leader_nudges` não lidos.

**Implementação:**
- Hook composto `useLeaderInbox()` em `src/hooks/useLeaderInbox.ts` com 4 queries paralelas (react-query).
- Componente `src/components/dashboard/SmartInbox.tsx` — lista cliclável (cada item navega).
- Mostrar no `Index.tsx` quando setup estiver completo OU passou D7.

---

### S2.4 — Time Health Score como hero do `/hr`

Já existe a fórmula 40/30/30 (memo `mem://features/hr/health-score-kpi`). Promover.

**Componente:** `src/components/hr/HealthScoreHero.tsx`
- Número grande (text-7xl) com gradiente.
- Tooltip explicando "40% Cobertura • 30% PDI • 30% Risco mitigado".
- Sparkline 4 semanas usando `recharts` (LineChart minimalista).

**DB:** estender `get_hr_dashboard_metrics` para retornar `health_score` + `health_score_history[4]` (snapshots semanais).

Posicionar acima dos 3 KPIs já existentes em `HRDashboard.tsx`.

---

### S2.5 — Líderes em risco (HR)

**DB:** RPC `get_leaders_at_risk(_workspace_id uuid)`:
```
returns table(
  manager_id uuid, manager_name text, manager_email text,
  members_without_note_30d int,
  last_mentor_chat_at timestamptz,
  last_activity_at timestamptz,
  risk_reason text
)
```
Critérios: `members_without_note_30d >= 3` OR `last_mentor_chat_at < now() - interval '14 days'`.

**Frontend:** `src/components/hr/LeadersAtRiskTable.tsx` em nova seção do `HRDashboard.tsx`. Botão "Enviar nudge" cria registro em `leader_nudges` (já existe) com `nudge_type='hr_recommendation'`.

---

### S2.8 — Liderado: "Pedir conversa" com nudge real

Atualmente existe um botão "Suggest 1:1" que copia para clipboard (em `DirectReportDashboard.tsx` / `SkillsMapCard`). Substituir por:

**Modal:** `RequestConversationDialog`
- Textarea: "Sobre o que você quer conversar?"
- Cria em `leader_nudges` com `nudge_type='member_request_1on1'`, `metadata: { topic, requested_by }`.
- Edge function `send-member-nudge` despacha conforme prefs do líder (S2.3): in_app (já cai no ActivityBadge), email (template novo `conversation-request.tsx`) e/ou Slack DM (reusa `slack-bot`).

---

## Observações técnicas

- **Erro de runtime atual** (`Cannot read properties of null (reading 'useEffect')` em `QueryClientProvider`) — provável `react` duplicado ou `package.json` corrompido durante S1. Vou diagnosticar e corrigir antes de começar a Sprint 2 (provavelmente dedupe de `bun.lock`).
- Toda string nova passa por i18n PT-BR / EN / ES.
- Toda nova tabela usa `effective_user_id()` para impersonação safe.
- Toda nova RPC `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Crons ficam para Sprint 3 — Sprint 2 é só estrutura + UI + queries on-demand.
- `recharts` já está no projeto (vem com shadcn `chart.tsx`).

## Ordem de execução proposta

1. **Fix do runtime error** (verificar deps, dedupe).
2. **S2.3** (settings + DB) — destrava Sprint 3.
3. **S2.1** (3 abas no MemberDetails).
4. **S2.6** (sync wizard liderado).
5. **S2.7** (radar).
6. **S2.4** (health score hero).
7. **S2.5** (líderes em risco).
8. **S2.2** (Smart Inbox).
9. **S2.8** (request conversation + edge function).

Vou executar tudo numa única passada de implementação. Sem mais perguntas — código já mapeado e o plano da Sprint 2 estava aprovado.

