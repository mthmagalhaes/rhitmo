# Sprint 13 — ONA Foundation: Team Network Graph + Rhy Voice

Objetivo: criar a fundação de dados e tom de voz para o grafo de colaboração (ONA), sem ainda expor ao líder. Entrega validável internamente via tela de debug do God's Eye.

---

## 1. Migração de banco — Network Graph

### Tabela `graph_events_raw` (eventos brutos, TTL 90d)
Captura cada sinal individual de colaboração antes da agregação.

Colunas-chave:
- `workspace_id`, `source` (`slack` | `gcal` | futuro: `linear`, `github`, `hubspot`)
- `actor_member_id`, `target_member_id` (FK `team_members.id`, ambos podem ser null se não resolvido)
- `event_type` (`mention`, `thread_reply`, `reaction`, `meeting_attendee`, `dm`)
- `weight` (numeric, default 1.0 — DM vale mais que reaction)
- `occurred_at` (timestamptz, real factual)
- `external_ref` (text, ex: `slack_message_ts` ou `gcal_event_id`) — idempotência
- `metadata` jsonb
- Particionamento por mês em `occurred_at`
- Index: `(workspace_id, occurred_at DESC)`, `(actor_member_id, target_member_id, occurred_at)`
- Unique: `(source, external_ref, event_type, actor_member_id, target_member_id)` evita duplicatas
- TTL: cron mensal apaga partições > 90d

### Tabela `team_network_edges` (agregado, atualizado diariamente)
Uma linha por par de membros + janela.

Colunas-chave:
- `workspace_id`, `member_a_id`, `member_b_id` (sempre `a.id < b.id` — edge não-direcionado canônico)
- `window_days` (`30` | `60` | `90`)
- `weight_total` numeric (soma ponderada de eventos na janela)
- `event_count` integer
- `sources` text[] (quais fontes contribuíram)
- `last_event_at` timestamptz
- `computed_at` timestamptz
- Unique: `(workspace_id, member_a_id, member_b_id, window_days)`
- Index: `(workspace_id, member_a_id, window_days)`, `(workspace_id, member_b_id, window_days)`

### RLS — diferenciada por papel
Ambas tabelas com RLS strict. Policies via `SECURITY DEFINER` functions para evitar recursão:

- `can_view_network_edge(member_a uuid, member_b uuid, workspace uuid)` retorna true se:
  - `is_admin()` (super admin) OU
  - `is_workspace_owner(workspace, effective_user_id())` OU
  - `is_hr_admin_of_workspace(workspace)` OU
  - **Leader**: `is_team_leader(effective_user_id(), member_a)` OR `is_team_leader(..., member_b)` (vê edge se pelo menos uma ponta é liderado dele) OU
  - **Liderado**: `member_a` OR `member_b` está linkado a `auth.uid()` (vê só edges egocêntricos)

- `graph_events_raw`: mesma lógica, mas mais restrita — leaders só veem eventos onde **ambos os endpoints são acessíveis** (evita vazar canal cruzado quando só uma ponta é liderado).

INSERTs em ambas tabelas: somente `service_role` (edge functions).

---

## 2. Edge function `build-team-graph` (cron diário 03:00 UTC)

Responsabilidade: ler novos eventos de Slack + Calendar e atualizar `graph_events_raw` + recomputar `team_network_edges`.

### Fluxo
1. Para cada workspace ativo com Slack OU Google Calendar conectado:
   - **Slack**: para cada `slack_integration` do workspace, busca mensagens novas dos canais autorizados desde `last_run_at`. Extrai mentions, thread parents, reactions. Resolve `slack_user_id → team_members.id` via `slack_user_member_map` (já existente).
   - **Calendar**: para cada `google_calendar_token` do workspace, lista eventos com 2+ attendees nos últimos 7d. Para cada par de attendees, gera evento `meeting_attendee` com weight = `duration_minutes / 30`.
2. INSERT em `graph_events_raw` com ON CONFLICT DO NOTHING (dedup via `external_ref`).
3. Para cada workspace, recomputa `team_network_edges` para janelas 30/60/90:
   - DELETE FROM `team_network_edges` WHERE `workspace_id = X AND window_days IN (30,60,90)`
   - INSERT SELECT agregando `graph_events_raw` no período `now() - interval 'N days'`
4. Registra run em `automation_runs` (`job_name='build-team-graph'`).

### Pesos iniciais (calibráveis)
- Slack DM: 3.0
- Slack thread_reply (mesma thread): 2.0
- Slack mention em canal: 1.5
- Slack reaction: 0.3
- Calendar meeting attendee: `min(duration_min/30, 4.0)` (cap em 2h = peso 4)

### Cron
Via `pg_cron` + `pg_net` (insert tool, não migration) — `0 3 * * *`.

### Observability
Usar `_shared/logger.ts`. Log resumo: `{workspace_id, events_ingested, edges_computed, duration_ms}`.

---

## 3. `_shared/rhy-voice.ts` — Constituição de voz humana

Novo arquivo no padrão `rhitmo-constitution.ts`. Define:

- **Princípios** (string export `RHY_PRINCIPLES`):
  - Nunca diagnostica, sempre observa ("Notei que…")
  - Conversa, não relatório (frases curtas, sem bullets robóticos em DM)
  - Pergunta antes de sugerir (abre conversa, não empurra ação)
  - Linguagem de colega sênior, não de RH
  - Reconhece incerteza ("pode ser nada, mas…")
  - Nunca usa jargão de ONA/grafo/métrica para o líder

- **Helper `buildRhySystemPrompt(context: { audience: 'leader' | 'member', surface: 'slack_dm' | 'web_card', situation?: string })`**: monta system prompt combinando RHITMO_CONSTITUTION + RHY_PRINCIPLES + ajustes de surface (Slack: sem markdown pesado, máx 4 linhas; Web: pode usar parágrafos).

- **Exemplos few-shot** dentro do prompt para calibrar tom (antes/depois).

Não refatora funções existentes neste sprint — só cria a base. Sprint 14 vai usar isso ao reescrever brief + alertas.

---

## 4. Tela de debug `/admin/network-debug` (God's Eye)

Página restrita a `super_admin` para validar o grafo antes de expor a leaders.

UI:
- Workspace selector (dropdown de todos workspaces ativos)
- Janela selector (30/60/90)
- Visualização em tabela: top 50 edges por `weight_total`, com colunas `member_a`, `member_b`, `weight_total`, `event_count`, `sources`, `last_event_at`
- Card de stats: total edges, isolates count (membros sem edges na janela), super-connectors (top 5 por weight somado)
- Botão "Trigger build-team-graph now" (chama edge function manualmente)

Visualização de grafo (D3/Sigma) **fica fora do scope deste sprint** — só tabela.

Rota adicionada em `App.tsx` com guard `isSuperAdmin`. Item no AppSidebar do super-admin.

---

## 5. Não inclui (próximos sprints)

- Sprint 14: Brief enriquecido com bloco "🕸️ Rede" + reescrita de prompts com `buildRhySystemPrompt` + widget "Pulso do time" no `/lider/inicio` + reativação do `/lider/contexto` com feed de rede
- Sprint 15: Detector de isolates/super-connectors/mudança de padrão + DMs proativas via `slack-rhitmo-orchestrator`
- Sprint 16: Sugestão de peer reviewers no Rhitmo Trimestral/Formal wizard
- Conectores adicionais (HubSpot, Linear, GitHub)

---

## Checklist técnico

```text
1. Migração SQL
   ├── CREATE TABLE graph_events_raw (particionada por mês)
   ├── CREATE TABLE team_network_edges
   ├── CREATE FUNCTION can_view_network_edge() SECURITY DEFINER
   ├── RLS policies (SELECT por papel + INSERT service_role)
   └── Indexes + uniques

2. Edge function build-team-graph
   ├── Lê Slack messages (paginated, since last_run)
   ├── Lê Calendar events (últimos 7d)
   ├── INSERT graph_events_raw (ON CONFLICT DO NOTHING)
   ├── Recompute team_network_edges (3 janelas)
   └── Log em automation_runs

3. pg_cron daily 03:00 (via insert tool, não migration)

4. _shared/rhy-voice.ts (princípios + buildRhySystemPrompt)

5. /admin/network-debug
   ├── Page component (React + tabela)
   ├── Hook useNetworkDebug (workspace+window selector)
   ├── Botão "Trigger now" → invoke build-team-graph
   └── Rota + sidebar item (super admin only)

6. Memory updates
   └── mem://features/ona/network-graph-foundation.md
```
