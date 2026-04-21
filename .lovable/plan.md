

# Plano de execução — Auditoria de produto (organizado por Eisenhower)

Vou organizar todos os itens (cortes + adições + temas transversais) em uma matriz de Eisenhower (Impacto × Esforço), depois traduzir em **stories implementáveis** agrupadas por sprint. Cada story tem persona, critério de aceite e arquivos afetados.

---

## Matriz Eisenhower

```text
                  ALTO IMPACTO
                       │
   FAZER AGORA         │      PLANEJAR
   (alto / baixo)      │      (alto / alto)
                       │
   • Cortar Upgrade    │   • Smart Inbox líder
     Banner            │   • MemberDetails 3 abas
   • Trim SetupCheck   │   • Time Health Score hero
     (5→3 + auto-hide  │   • Líderes em risco (HR)
      D7)              │   • Mirror function
   • UUIDs → nomes     │   • Settings de notificações
     (HR table)        │     (Slack/email/in-app)
   • Note Templates    │   • Resumo da semana
   • Cortar aba        │     (sexta automática)
     Feedbacks do      │   • Self-reflection semanal
     liderado          │     liderado
   • Cortar aba        │   • Comparativo times
     Analytics da      │     (heatmap HR)
     sidebar líder     │   • Export PDF executivo
   • Header MemberDet  │     mensal
     1 botão + dropd   │   • Alertas proativos
   • Mover Competên-   │     HR (Slack/email)
     cias p/ subitem   │   • Quebrar Sync dialog
                       │     em 3 microsteps
                       │   • SkillsMap radar
                       │     memorável
   ────────────────────┼─────────────────────
                       │
   DELEGAR/AGENDAR     │      DESCARTAR
   (baixo / baixo)     │      (baixo / alto)
                       │
   • Suggest 1:1 →     │   • Reanálise Career
     nudge real        │     Compass automática
   • Cortar Sentimento │     (background — não
     agregado overview │     bloqueia release)
   • Meu Próximo Marco │   • What's New widget
     card liderado     │     (substituir desco-
                       │     berta de feature)
                       │
                  BAIXO IMPACTO
```

---

## Organização em 3 Sprints (Stories)

### Sprint 1 — Quick Wins (1 semana, baixo risco)

**S1.1 — Limpar dashboard do líder**
- Remover `UpgradeBanner` do topo do dashboard. Manter apenas em `/billing` + tooltips contextuais já existentes nos limites.
- `SetupChecklist`: reduzir de 5 → 3 passos (membros + 1ª nota + leader sync). Auto-esconder após 7 dias do signup, mesmo incompleto.
- **Arquivos:** `src/pages/Index.tsx`, `src/components/SetupChecklist.tsx`.
- **Aceite:** dashboard do líder D7+ não mostra checklist nem upgrade banner.

**S1.2 — Sidebar enxuta do líder**
- Remover item "Analytics" da sidebar do líder (manter visível só para HR Admin).
- Mover acesso a Analytics para uma aba interna no dashboard (ou link discreto no header).
- **Arquivos:** `src/components/AppSidebar.tsx`.

**S1.3 — Cortar atrito no MemberDetails (header)**
- Header: 1 botão primário "Nova Nota" + dropdown "Mais ações" (Gravar Reunião, Mentor Chat).
- **Arquivos:** `src/pages/MemberDetails.tsx`.

**S1.4 — Templates de Nota**
- Adicionar seletor de template no `NewNoteDialog`: "1:1 semanal", "Pós-projeto", "Feedback difícil", "Em branco". Cada template preenche estrutura (cabeçalhos, prompts) no Tiptap.
- **Arquivos:** `src/components/NewNoteDialog.tsx` + novo `src/lib/noteTemplates.ts`.

**S1.5 — HR: UUIDs → nomes/avatares**
- Tabela "Atividade dos Líderes": resolver `manager_id` para nome+avatar via join com `profiles`/`auth.users`.
- **Arquivos:** `src/pages/HRDashboard.tsx` + edge function de agregação se houver.

**S1.6 — HR: Reduzir KPIs do Overview de 5 → 3**
- Mostrar apenas Cobertura (% liderados com nota nos 30d), Maturidade (% PDI ativo), Risco (# liderados em zona vermelha). Cada KPI clicável → drill-down.
- Remover "Distribuição de Sentimento" do Overview; manter apenas em `/hr/analytics`.
- **Arquivos:** `src/pages/HRDashboard.tsx`, `src/components/hr/*`.

**S1.7 — HR: mover Competências para subitem**
- Tirar "Competências" do menu top-level HR; mover para sub-item dentro de "Liderados" ou para `/hr/settings`.
- **Arquivos:** `src/components/AppSidebar.tsx`, rotas em `src/App.tsx`.

**S1.8 — Liderado: cortar aba "Feedbacks"**
- Remover item de menu "Feedbacks" do liderado. Mostrar últimos 3 shared no dashboard com link "ver todos" inline.
- **Arquivos:** `src/components/AppSidebar.tsx`, `src/components/dashboard/DirectReportDashboard.tsx`.

---

### Sprint 2 — Restruturação UX (2 semanas)

**S2.1 — MemberDetails: 3 abas horizontais**
- Refatorar accordion de 6 seções para 3 tabs: **Pessoa** (Sync + Skills + User Manual), **Histórico** (notas + reuniões), **Performance** (PDI + Reviews + Goals).
- Manter URL deep-link (`?tab=performance`).
- **Arquivos:** `src/pages/MemberDetails.tsx`.

**S2.2 — Smart Inbox no dashboard do líder**
- Substituir o checklist por card "Hoje você tem: X 1:1s • Y liderados sem nota há 14d • Z reviews aguardando envio". Cada item navegável.
- Lógica: query agregada de calendário, feedbacks (agrupar por member_id sem feedback há 14d), reviews em status draft.
- **Arquivos:** novo `src/components/dashboard/SmartInbox.tsx`, `src/pages/Index.tsx`, novo edge function `aggregate-leader-inbox` ou hook composto.

**S2.3 — Settings de notificações (pré-requisito para resumo semanal e nudges)**
- Adicionar seção "Notificações" no `ProfileSettingsDialog` com toggles: Resumo semanal (off/email/Slack), Marcos PDI (off/email/Slack), Self-reflection prompt (off/email/Slack), Alertas HR (off/email/Slack — só HR).
- **DB:** nova tabela `user_notification_preferences (user_id, channel_type, enabled, channel)`.
- **Arquivos:** migração, `src/components/ProfileSettingsDialog.tsx`, novo hook `useNotificationPreferences`.

**S2.4 — Time Health Score como hero do `/hr`**
- Promover Health Score 40/30/30 para card hero gigante no topo do `/hr`. Tooltip explicando a fórmula. Tendência últimas 4 semanas (sparkline).
- **Arquivos:** `src/pages/HRDashboard.tsx`, novo `src/components/hr/HealthScoreHero.tsx`.

**S2.5 — Líderes em risco (HR)**
- Nova tabela na aba Liderados/Times: líderes com 3+ liderados sem nota há 30d OU sem uso de Mentor Chat há 14d. Coluna "Última atividade", botão "Enviar nudge".
- **DB:** view ou função `get_leaders_at_risk(workspace_id)`.
- **Arquivos:** `src/pages/HRDashboard.tsx`, novo `src/components/hr/LeadersAtRiskTable.tsx`.

**S2.6 — Quebrar Rhitmo Sync dialog em 3 microsteps**
- Refatorar `LeaderSyncWizard` (já é wizard) e o dialog do liderado em microsteps com salvamento progressivo: chronotype → motivadores → user manual. Cada step grava parcial.
- **Arquivos:** `src/components/LeaderSyncWizard.tsx` ou equivalente do liderado.

**S2.7 — SkillsMap visual memorável**
- Refatorar `SkillsMapCard` para radar chart (recharts) ou heatmap, com hover mostrando evidências.
- **Arquivos:** `src/components/dashboard/SkillsMapCard.tsx`.

**S2.8 — Liderado: "Pedir conversa" com nudge real**
- Substituir "Suggest 1:1" (clipboard copy) por modal "Pedir conversa sobre [tema]" → cria registro em `leader_nudges` com `nudge_type='member_request_1on1'` e dispara notificação ao líder (Slack/email conforme prefs).
- **Arquivos:** `src/components/dashboard/DirectReportDashboard.tsx`, edge function `send-member-nudge`.

---

### Sprint 3 — Diferenciação estratégica (3-4 semanas)

**S3.1 — Resumo da Semana automático (sexta-feira)**
- Cron job sexta 16h: para cada líder com `weekly_summary` ativo, gerar resumo (mudanças por liderado + 1 ação sugerida) e enviar via canal preferido (email render React Email / Slack DM).
- **Arquivos:** novo edge function `generate-weekly-leader-summary` + cron, novo template `weekly-summary.tsx` em transactional-email-templates.

**S3.2 — Mirror function (Estratégia vs. 1:1s)**
- Card no MemberDetails (aba Performance ou Histórico): líder define 2-3 prioridades estratégicas para o liderado; IA compara com tags/temas das notas dos últimos 90 dias e mostra desvios.
- **DB:** nova tabela `member_strategic_priorities (member_id, priority_text, weight)`.
- **Arquivos:** novo `src/components/MirrorAnalysisCard.tsx`, edge function `analyze-strategy-vs-execution`.

**S3.3 — Liderado: "Meu Próximo Marco"**
- Card topo do dashboard do liderado: próximo evento (review, deadline PDI). Notificação ao se aproximar via canal preferido.
- **Arquivos:** `src/components/dashboard/DirectReportDashboard.tsx`, lógica em hook `useUpcomingMilestone`.

**S3.4 — Self-reflection prompt semanal (liderado)**
- Cron segunda-feira 9h: enviar 1 pergunta semanal (rotativa) via canal preferido. Resposta vira input em `meu_rhitmo` e alimenta a Matriz de Análise Integrada (não vaza para líder).
- **DB:** nova tabela `member_self_reflections (member_id, question, answer, week)`.
- **Arquivos:** edge function `send-self-reflection-prompt` + cron, nova rota `/reflexao/:token` para responder sem login pesado.

**S3.5 — Alertas proativos HR (Slack/email)**
- Cron diário: detectar limiares (líder sem notas 30d, queda de cobertura >20% em time, liderado em risco vermelho 14d). Notificar HR Admins do workspace via canal preferido.
- **Arquivos:** edge function `hr-proactive-alerts` + cron.

**S3.6 — Comparativo entre times (heatmap HR)**
- Em `/hr/analytics`: heatmap times × (Cobertura, Maturidade, Risco). Cores semáforo. Click → drill-down.
- **Arquivos:** `src/pages/HRAnalytics.tsx`, novo `src/components/hr/TeamsHeatmap.tsx`.

**S3.7 — Export executivo mensal PDF**
- Botão "Exportar relatório mensal" em `/hr`: gera PDF de 1 página (Health Score, top 3 alertas, top 3 sucessos, sparkline 4 semanas). Cron opcional envia automaticamente dia 1 do mês.
- **Arquivos:** edge function `generate-hr-monthly-report` (usar `@react-pdf/renderer` ou render HTML→PDF via servico).

**S3.8 — Ambient AI no ActivityBadge**
- Job diário detecta padrões interessantes (ex.: "3 notas desta semana sobre liderado X mostram tema recorrente Y") e cria notificação no `ActivityBadge` com CTA "Ver análise" → abre Mentor Chat pré-populado.
- **DB:** estender `leader_nudges` com `nudge_type='ai_pattern_detected'` e `metadata jsonb` com prompt sugerido.
- **Arquivos:** edge function `detect-ambient-patterns` + cron, ajuste em `src/components/ActivityBadge.tsx` e `ActivitySheet.tsx`.

---

## Itens descartados ou diferidos

- **Reanálise automática Career Compass** — manter botão por enquanto (reanálise full custa tokens). Pequena melhoria: invalidar cache quando responsabilidades mudarem; reanalisar sob demanda.
- **What's New widget** — bom, mas baixa prioridade; agendar pós-Sprint 3.

---

## Observações técnicas globais

- **Settings de notificações (S2.3) é pré-requisito** para S3.1, S3.3, S3.4, S3.5. Implementar primeiro.
- Toda notificação Slack reusa infra existente (`slack-bot` edge function + token do workspace).
- Toda notificação email reusa `pgmq` + `notify.rhitmo.co` + React Email templates.
- Crons via `pg_cron` + `pg_net` (já habilitados).
- Manter i18n PT-BR / EN / ES em todas as strings novas.
- Respeitar `effective_user_id()` em RLS para todas as novas tabelas (impersonation safe).

---

## Recomendação de execução

Começar pelo **Sprint 1 inteiro** em uma única implementação (8 stories pequenas, todas independentes, baixo risco). Depois alinhar e abrir Sprint 2 começando por **S2.3 (Settings de Notificações)** já que destrava todo o Sprint 3.

**Posso começar a implementar o Sprint 1 completo agora?** Se preferir granular, me diga quais stories priorizar primeiro.

