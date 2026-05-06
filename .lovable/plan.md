## Sprint 14 — ONA aplicado: Brief com rede, Pulso do time e Contexto reativado

Sprint 13 entregou a fundação (graph_events_raw, team_network_edges, RLS, build-team-graph, rhy-voice). A Sprint 14 transforma esse grafo em valor visível para o líder, sem quebrar nada do que já existe.

### Objetivo

1. Brief enriquecido com bloco "🕸️ Rede" (proativo via Slack ~18h antes da 1:1, e visível no card de prep no app).
2. Widget "Pulso do time" no `/lider/inicio` (Bento) — sempre visível, silencioso, sem alarmismo.
3. `/lider/contexto` ganha conteúdo real: feed cronológico de detecções de rede (isolates, super-connectors, mudanças de padrão), reaproveitando o item de menu hoje subutilizado.

Tudo escrito com a voz do Rhy (`_shared/rhy-voice.ts`).

---

### Entregáveis

**1. Migration: `network_signals` (detecções derivadas)**

Tabela leve que materializa "achados" do grafo para consumo rápido pelo Brief e Pulso. Não refaz o cálculo a cada render.

```text
network_signals
├── id uuid pk
├── workspace_id uuid (fk teams via leader)
├── leader_user_id uuid             ← dono do sinal
├── member_id uuid (fk team_members)
├── signal_type text                ← 'isolate' | 'super_connector' | 'pattern_drop' | 'pattern_spike'
├── window_days int                 ← 30/60/90
├── severity text                   ← 'info' | 'watch' | 'attention'
├── payload jsonb                   ← {prev_weight, curr_weight, delta_pct, top_peers, ...}
├── detected_at timestamptz default now()
├── acknowledged_at timestamptz null
└── unique (leader_user_id, member_id, signal_type, window_days, date_trunc('day', detected_at))
```

RLS: leader vê os próprios sinais; HR Admin/Super Admin veem do workspace; member vê só os próprios (severity 'info' apenas, para não vazar diagnóstico).

RPC `get_team_pulse(_window_days)` — retorna sinais ativos (não acknowledged) do líder logado, ordenados por severidade. SECURITY DEFINER + plpgsql (regra do projeto).

**2. Edge Function: `detect-network-signals` (cron diário, após build-team-graph)**

- Lê `team_network_edges` por workspace.
- Detecta:
  - isolate: membro com `sum(weight_total) < threshold` na janela 30d.
  - super_connector: top-N por peso agregado (info, não atenção).
  - pattern_drop: queda > 50% comparando janela 30d vs 60d-30d.
  - pattern_spike: aumento > 100% (info).
- Insere em `network_signals` com unique-on-day para evitar spam.
- Cron via `pg_cron` (insert tool, não migration) às 03:30 UTC, depois do build.

**3. Brief enriquecido — bloco "🕸️ Rede"**

Atualizar `_shared/briefGenerator.ts` para:
- Buscar edges do par (líder ↔ liderado) e top-3 colaboradores do liderado nos últimos 30d.
- Buscar `network_signals` ativos para esse member_id.
- Injetar no prompt um bloco estruturado: "Top colaboradores reais: X, Y, Z. Sinais ativos: [se houver]."
- Output do brief ganha seção opcional "🕸️ Rede" (markdown), gerada com tom Rhy via `wrapAsRhy()`.

Sem quebrar fallback: se grafo vazio (workspace sem Slack/Calendar), seção é omitida silenciosamente.

**4. `slack-rhitmo-orchestrator` — janela 18h**

Hoje envia DM no range 12h–36h. Ajustar para preferir disparo em ~18h (±2h) antes da 1:1, mantendo idempotência via `brief_dm_sent_at`. Se falhar a janela ideal (cron rodou tarde), cai no comportamento atual como fallback.

**5. Widget "Pulso do time" — `/lider/inicio`**

Novo componente `<TeamPulseBento>` na Home (junto aos 3 blocos atuais: AccountSetupBento, Próximas 1:1s, MentorHistoryCard — sem remover nenhum, conforme regra Home V3).

Layout (rounded-2xl, soft shadow, max-w-5xl):
- Header: "Pulso do time" + janela (30d default, toggle 30/60/90).
- 3 chips compactos: `N quietos` · `M super-conectados` · `K mudanças`.
- Lista até 3 sinais prioritários com texto Rhy ("Reparei que a Maria andou meio quieta…").
- CTA "Ver tudo no Contexto" → `/lider/contexto?tab=rede`.
- Estado vazio: "Tudo fluindo. Sem sinais nas últimas semanas." (sem alarmismo).

Hook `useTeamPulse(windowDays)` chamando `get_team_pulse`.

**6. `/lider/contexto` — aba Rede**

Contexto hoje só tem o feed de evidências. Adicionar Tabs no topo:
- "Evidências" (atual, default).
- "Rede" (novo) — feed cronológico de `network_signals` com filtro por liderado e por tipo. Cada card mostra:
  - Avatar + nome do liderado.
  - Texto Rhy descrevendo o sinal.
  - Métrica seca (peso 30d vs 60d, top peers).
  - Ações: "Marcar como lido" (acknowledged_at) · "Agendar 1:1" (link p/ /lider/1on1s).

Sem mexer na aba Evidências existente.

**7. Memórias**

- `mem://features/ona/network-signals-and-pulse` — modelo de detecção, severidades, RLS.
- `mem://features/ona/brief-network-block` — formato do bloco e regras de fallback.
- Atualizar `mem://design/dashboard/home-v3-windmill` — incluir TeamPulseBento como 4ª seção.

---

### Detalhes técnicos

- **Sem quebrar nada:** todas as queries de Pulso/Rede são aditivas; se `network_signals` vazia, widget mostra empty state e Contexto/Tab Rede fica vazia. Brief faz fallback graceful.
- **Performance:** detect-network-signals roda 1×/dia, materializa até ~N×3 linhas por workspace. Home usa 1 RPC indexada.
- **Voz Rhy:** todo texto user-facing passa por `wrapAsRhy()` ou usa templates do `rhy-voice.ts`. Sem jargão ONA na UI ("isolate" vira "andou mais quieto", "super_connector" vira "muito procurado pelo time").
- **Privacidade:** member nunca vê sinais sobre OUTROS members; só os próprios em severity 'info'. Líder vê só do próprio time. HR vê do workspace.
- **safeRpc/safeFunctionInvoke** em todo frontend novo (regra do projeto).
- **Edge functions** seguem padrão: `supabase.auth.getUser()`, CORS, validação de input.

### Ordem de execução (segura)

```text
1. Migration: network_signals + RLS + get_team_pulse RPC
2. Edge function: detect-network-signals (com teste manual via /admin/network-debug)
3. pg_cron 03:30 UTC (insert tool)
4. briefGenerator.ts: bloco Rede + fallback
5. slack-rhitmo-orchestrator: ajuste janela 18h
6. Frontend: useTeamPulse + TeamPulseBento (Home)
7. Frontend: ContextoTabs + NetworkFeedTab
8. Memórias atualizadas
```

Cada passo é testável isoladamente. Posso pausar entre 4 e 5 para validar o brief antes de mexer no orchestrator.

Quer que eu siga nessa ordem?
