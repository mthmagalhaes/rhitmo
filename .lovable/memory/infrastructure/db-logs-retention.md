---
name: DB Logs Retention
description: Cron `db_logs_retention_daily` mantém cron.job_run_details (7d) e net._http_response (24h); sem retenção o DB encheu 2.7GB com lixo operacional
type: feature
---

**Problema histórico (Nov/26):** DB chegou a 2.9 GB, dos quais 2.7 GB era `cron.job_run_details` e 170 MB `net._http_response`. O cron `function_logs_retention_weekly` só limpa `public.function_logs`, **não toca nessas duas tabelas operacionais do Postgres/pg_net**. Como temos 23+ crons (vários por minuto/segundo), acumulou.

**Solução:** cron `db_logs_retention_daily` (03:15 UTC) roda:
```sql
DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
DELETE FROM net._http_response WHERE created < now() - interval '24 hours';
```

**Frequências reduzidas no mesmo trabalho:**
- `process-email-queue`: 5s → 15s (trade-off: email pode demorar +10s; ok para transacional)
- `check-pending-leader-presence-every-minute`: 1min → 5min (jobname mantido por compat)

**Não tocar em** `event-dispatcher-30s-a/b` — o `-b` usa `pg_sleep(30)` pra efetivar 30s; consumidores podem depender dessa janela.

**Sinal de alerta:** se Cloud usage voltar a passar dos $25, primeiro lugar pra checar é `pg_database_size` e top tabelas por `pg_total_relation_size` — provavelmente é log operacional, não dado de produto.
