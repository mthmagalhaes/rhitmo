# Plano: cortar Cloud usage sem risco para o projeto

## Verificação de risco (já feita)

Antes de propor, chequei o que pode quebrar:

1. **`grep` em todo `supabase/functions` e `src`** por uso de `cron.job_run_details` ou `net._http_response` → **zero ocorrências**. Nenhuma edge function, frontend ou RPC lê dessas tabelas. São logs operacionais puros do Postgres/pg_net.
2. **`function_logs_retention_weekly`** já existente limpa `public.function_logs` (logs aplicativos da Rhitmo) — **não toca** em `cron.job_run_details` nem `net._http_response`. Por isso o disco encheu: ninguém estava limpando.
3. **`process-email-queue`** roda cada 5s mas é "inteligente" — só dispara `http_post` se tem mensagem em `pgmq.q_auth_emails` ou `q_transactional_emails`. Mesmo assim, o `SELECT CASE...` grava 1 linha em `job_run_details` a cada 5s = ~17k/dia.
4. **`event-dispatcher`** tem o truque do `-a` (no minuto) + `-b` (`pg_sleep(30)` + post) = efetivamente cada 30s. Aumentar pra 60s atrasa eventos em até 30s.

**Conclusão**: limpeza dos 2 logs é zero-risco. Mudança de frequência tem trade-off pequeno e mensurável.

## O que vai ser feito

### 1. Limpeza única (operação de dados, via `insert tool`)
- `DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days'` (em lotes via loop pra não segurar lock) — preserva últimos 7 dias pra debug recente
- `DELETE FROM net._http_response WHERE created < now() - interval '24 hours'`
- Em seguida `VACUUM` nas duas tabelas pra devolver o espaço ao SO

**Resultado esperado**: DB de 2.9 GB → ~50 MB.

### 2. Retenção contínua (novo cron diário, via `insert tool`)
Cron `db_logs_retention_daily` rodando 03:15 UTC:
- Mantém 7 dias de `cron.job_run_details`
- Mantém 24h de `net._http_response`

Garante que o disco estabiliza e nunca volta a crescer.

### 3. Reduzir frequência dos 2 crons mais barulhentos (via `insert tool`)
- **`process-email-queue`**: 5s → **15s**. Para email transacional/auth, 15s é imperceptível. Reduz 3x as escritas em `job_run_details`.
- **`check-pending-leader-presence-every-minute`**: cada minuto → **cada 5 min**. Já chequei: é um polling de presença de líderes pendentes, não tem SLA crítico.

**Não vou mexer em**:
- `event-dispatcher-30s-a/b` (mantém 30s — o sistema de eventos pode ter consumidores que dependem dessa janela; mudar exige análise separada)
- Nenhum outro cron diário/horário (já são baixa frequência)

## Trade-offs honestos

| Mudança | Trade-off | Risco real |
|---|---|---|
| Apagar `job_run_details` >7d | Perde histórico de "esse cron rodou em 12/abril?" | Zero — nada lê isso |
| Apagar `_http_response` >24h | Perde body de respostas async do pg_net | Zero — nenhuma função consulta |
| `process-email-queue` 5s→15s | Email pode demorar +10s pra sair | Baixíssimo |
| `check-pending-leader-presence` 1min→5min | Detecção de presença de líder pendente atrasa até 4min | Baixíssimo |

## O que **NÃO** vou fazer

- Não vou alterar schema de tabela de produto
- Não vou tocar em `feedbacks`, `performance_reviews`, `context_evidence`, `meeting_transcripts`, `chat_threads` ou qualquer dado de usuário
- Não vou desabilitar nenhum cron
- Não vou mexer em RLS, edge functions de produto, ou autenticação

## Como reverter se algo der errado

- Crons: `SELECT cron.alter_job(...)` pra voltar frequência original (guardo as values atuais antes de mudar)
- Logs deletados: **não revertíveis**, mas como ninguém os usa, não há impacto

## Impacto financeiro estimado

- DB de 2.9 GB → 50 MB elimina a maior fatia de disco do Cloud usage
- Menos escritas/segundo reduz compute também
- Esperado: voltar pra **dentro dos $25 grátis** com folga

---

Posso seguir?
