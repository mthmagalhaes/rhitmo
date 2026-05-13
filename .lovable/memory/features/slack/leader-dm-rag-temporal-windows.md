---
name: Slack DM — RAG temporal sem interceptor
description: NL "resumo mensal/semana/últimos N dias" no Slack cai em chat-mentor com janela detectada server-side; sem interceptor que lê monthly_recaps
type: feature
---

`slack-bot` permanece intocado: toda DM/menção do líder em linguagem natural ("resumo mensal da Gabi", "como foi a semana do João", "últimos 45 dias") é roteada normalmente para `chat-mentor` (modo `member` ou `leader_self`).

**Detecção temporal em `chat-mentor`:**
- Helper `detectTimeWindow(question)` cobre PT/EN: "hoje", "esta/última semana", "este/último mês", "mês passado", "trimestre", "semestre", "este ano", "últimos N dias/semanas/meses", "last N ...".
- Retorna `{dateFrom, dateTo, label}` ou `null`. Aplicado só em modo `member`.

**Filtro pós-RPC** (RPCs `match_feedbacks`/`match_context_evidence` não aceitam datas):
- `feedbacks` recentes filtrados por `occurred_at || created_at`.
- `match_feedbacks` filtrado por `created_at` retornado.
- `match_context_evidence` filtrado por `occurred_at` retornado.
- Logs `[time-window]` mostram quantos itens sobraram.

**Reforço no system prompt** (apenas quando há janela): bloco "## 🗓️ JANELA TEMPORAL" instrui resposta em 3 blocos (🚀 Destaque / ⚠️ Atenção / 🧭 Padrão dominante) com `[doc:UUID]` em cada — mas só para perguntas tipo "resumo do período"; perguntas pontuais ficam livres. Janela vazia → resposta transparente "sem registros em {label}".

**Decisão de produto:** zero regeneração de `monthly_recaps` no Slack. Recaps continuam canônicos só para Avaliação Formal e aba Mensal na web.
