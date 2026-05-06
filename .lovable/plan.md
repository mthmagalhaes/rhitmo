## Sprint 14 — Itens pendentes

Três ajustes finais para fechar a Sprint 14 sem quebrar nada existente.

### 1. pg_cron: build diário do grafo + detecção de sinais

Agendar dois jobs no pg_cron (extensão já habilitada no projeto). Como envolvem URL/anon key específicos do projeto, vão via insert SQL (não migration), conforme padrão Lovable:

- `build-team-graph-daily` — todo dia às 03:00 UTC, dispara `build-team-graph` para recomputar `team_network_edges` a partir de `ctx_evidence` dos últimos 30d.
- `detect-network-signals-daily` — todo dia às 03:30 UTC (após o build), dispara `detect-network-signals` para materializar `network_signals` (isolates, super-connectors, pattern_drop, pattern_spike).

Ambos usam `net.http_post` com header `apikey` = anon key. Idempotência já garantida pelo unique-on-day em `network_signals` e pelo upsert em `team_network_edges`.

### 2. slack-rhitmo-orchestrator: janela ~18h antes da 1:1

Hoje a função envia DM de prep entre 12h e 36h antes do evento. Ajuste:

- **Janela ideal:** 16h–20h antes (centro em 18h). Se a 1:1 cair nessa janela na próxima execução do cron (`*/30`), enfileira o DM.
- **Fallback:** se a 1:1 está a <16h e ainda não foi enviado nada (`brief_dm_sent_at IS NULL`), envia imediatamente — preserva o comportamento atual para meetings de última hora.
- **Idempotência:** mantém `brief_dm_sent_at` como guard. Sem mudança de schema.

Edição localizada em `supabase/functions/slack-rhitmo-orchestrator/index.ts` (apenas a query de seleção de eventos e o predicado de "está na janela").

### 3. Memórias

Três entradas novas / atualizadas no `mem://index.md`:

- `mem://features/ona/network-signals-and-pulse` — tabela `network_signals`, RPCs `get_team_pulse` / `acknowledge_network_signal`, edge `detect-network-signals`, regra de severidade e RLS por papel.
- `mem://features/ona/brief-network-block` — bloco "Contexto de rede" no `briefGenerator.ts`: top colaboradores + sinais ativos, falando sempre via `wrapAsRhy()` (tom humano, observacional, nunca prescritivo).
- Atualizar `mem://design/dashboard/home-v3-windmill` — adicionar `TeamPulseBento` como 4ª seção fixa da Home (após `MentorHistoryCard`), respeitando regra de "não remover seções existentes".

E atualizar `mem://features/slack/proactive-dms-orchestrator` com a nova janela 16h–20h + fallback.

### Detalhes técnicos

**Cron SQL (template, com URL/anon key reais do projeto inseridos via supabase insert):**
```sql
select cron.schedule(
  'build-team-graph-daily', '0 3 * * *',
  $$ select net.http_post(
    url:='https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/build-team-graph',
    headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
    body:='{}'::jsonb
  ); $$
);
select cron.schedule(
  'detect-network-signals-daily', '30 3 * * *',
  $$ select net.http_post(
    url:='https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/detect-network-signals',
    headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
    body:='{}'::jsonb
  ); $$
);
```

**Orquestrador — pseudocódigo da janela:**
```ts
const hoursUntil = (event.start_at - now) / 3600_000;
const inIdealWindow = hoursUntil >= 16 && hoursUntil <= 20;
const lateFallback   = hoursUntil > 0 && hoursUntil < 16 && !brief_dm_sent_at;
if (inIdealWindow || lateFallback) { /* enqueue DM */ }
```

### Ordem de execução

1. Insert SQL dos 2 cron jobs (via supabase insert tool).
2. Edit `slack-rhitmo-orchestrator/index.ts` + redeploy.
3. Criar 2 memórias novas + atualizar 2 existentes + index.

Sem mudanças de schema, sem novos componentes de UI — risco de quebra mínimo.