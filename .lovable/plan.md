## Sprint: RAG temporal no Slack + Avaliação Formal com RAG completo

Duas mudanças coordenadas, **zero alteração de UI** e **zero migration**. Tudo em duas edge functions.

---

### Parte 1 — Slack DM/menção: NL "resumo mensal" via RAG temporal

**Decisão:** sem interceptor para `monthly_recaps`. Toda pergunta em linguagem natural ("resumo mensal da Gabi", "como foi o mês do João", "últimos 45 dias", "essa semana") cai em `chat-mentor` com janela temporal aplicada na busca de evidências.

**Mudanças em `supabase/functions/chat-mentor/index.ts`:**

1. **Detector de janela temporal** (helper `detectTimeWindow(question)`): regex/palavras-chave em PT/EN cobrindo: "hoje", "esta semana", "este mês", "mês passado", "últimos N dias/semanas/meses", "trimestre", "ano". Retorna `{ dateFrom, dateTo, label }` ou `null`. Default quando ausente: últimos 90 dias para perguntas analíticas; sem filtro para perguntas pontuais (router decide).
2. **Aplicar janela na busca de evidências** (modo `member`):
  - Filtrar `feedbacks` recentes carregados pelo Slack por `occurred_at ∈ janela`.
  - Passar `dateFrom/dateTo` aos RPCs `match_feedbacks` e `match_context_evidence` (se a assinatura aceitar; senão filtrar pós-RPC pelo `occurred_at` retornado).
  - Logar `time_window` no `evidenceBreakdown` para debug.
3. **Reforço no system prompt** quando há janela detectada:
  - Bloco extra "## JANELA TEMPORAL: {label}" instruindo a IA a sintetizar em 3 partes quando a pergunta for tipo "resumo do período": **(a) destaque com citação, (b) ponto de atenção/risco com citação, (c) padrão dominante** — sempre com `[doc:UUID]`.
  - Manter o formato livre quando a pergunta for pontual (não forçar template).
4. **Slack-bot:** **nada muda**. O payload `leader_self`/`member` que ele já envia continua funcionando; a janela é detectada server-side em `chat-mentor`.

**Critério de aceite Slack:**

- "@Rhitmo me dá o resumo mensal da Gabi" → 3 blocos com citações da janela do último mês.
- "como foi a semana do João" → mesma estrutura, janela = 7 dias.
- "gera a avaliação formal do João" → resposta curta + link `/lider/avaliacoes` (já existe; manter).

---

### Parte 2 — Avaliação Formal: RAG completo + recaps como camada de contexto

**Diagnóstico:** `generate-formal-review` já lê `feedbacks` brutos + `meeting_transcripts` + recaps confirmados. **Faltam:** `pulses`, `peer_feedback_requests`, `performance_reviews` 360° (self/peer/upwards) e `context_evidence` (Slack/sinais). Hoje os recaps são tratados como "espinha" — vamos rebalancear: **evidência crua é a base, recaps são camada de calibração**.

**Mudanças em `supabase/functions/generate-formal-review/index.ts`:**

1. **Ampliar coleta de evidências do período** (todos filtrados por `occurred_at` ou equivalente em `[period_start, period_end]`):
  - `feedbacks` ✅ (já existe)
  - `meeting_transcripts` ✅ (já existe)
  - `context_evidence` (novo) — onde mora Slack, pulses processados, peer feedback, sinais de rede
  - `pulses` (novo) — respostas no período
  - `peer_feedback_requests` (novo) — respostas dos pares
  - `performance_reviews` 360° (novo) — onde `member_id = X` e `review_type IN ('self','peer','upwards')` no período
  - `monthly_recaps` confirmados ✅ (já existe — vira camada de contexto)
  - `quarterly_recaps` confirmados ✅ (já existe — vira camada de contexto)
2. **Reordenar `evidenceText**` — inverter prioridade narrativa:
  - **PRIMEIRO:** Evidência crua (anotações + 1:1s + context_evidence + pulses + 360°), com `[doc_id: UUID]` em todas.
  - **DEPOIS:** Camada de calibração (mensais + trimestrais confirmados) sob título "## CALIBRAÇÕES JÁ CONFIRMADAS PELO LÍDER (camada de contexto, não única fonte)".
  - Atualizar a regra #8 do system prompt: deixar de chamar recaps de "espinha"; passar a tratá-los como "ancoragem" — a IA deve **triangular** com a evidência crua, não só herdar.
3. **Citação 360°:** quando uma afirmação se apoiar em self/peer/upwards review, usar `*(autoavaliação de DD/MM)*` / `*(par: NomeAnônimo)*` / `*(upwards de DD/MM)*` além do `[doc:UUID]`.
4. **Guardrail de janela vazia:** se faltar evidência crua mas sobrar recap, prompt deve sinalizar "baseado apenas em calibrações resumidas — confirme antes de compartilhar" no rodapé.

  
  
**O que NÃO muda:**

- UI de `CreateFormalReviewDialog` (3 botões de período já está bom).
- RPC `get_review_evidence` (continua sendo usado pelo dialog para mostrar contagem prévia; nada muda).
- `generate-monthly-recap` / `generate-quarterly-recap` / crons / Slack nudges trimestrais — intactos.
- Sem migration: todas as tabelas adicionais já existem.

---

### Detalhes técnicos

**Arquivos tocados (2):**

- `supabase/functions/chat-mentor/index.ts` — helper `detectTimeWindow` + filtro temporal nos RPCs + bloco condicional no system prompt.
- `supabase/functions/generate-formal-review/index.ts` — 4 queries novas (`context_evidence`, `pulses`, `peer_feedback_requests`, `performance_reviews` 360°) + reordenação do `evidenceText` + ajuste do prompt regra #8.

**Sem migration. Sem mudança de UI. Sem tocar `slack-bot`.**

**Smoke tests:**

1. Slack DM "resumo mensal da @Gabi" → 3 blocos com `[doc:...]` da janela.
2. Slack DM "últimos 60 dias do João" → janela = 60d aplicada.
3. Web `/lider/avaliacoes` → "Gerar Formal" com período Q1 → review cita pulses + peer feedback + 1:1s, recaps aparecem como contexto secundário.
4. Caso vazio: período sem evidência crua mas com recap mensal → review gerada com aviso de baixa evidência.

**Memórias a salvar pós-implementação:**

- `mem://features/slack/leader-dm-rag-temporal-windows` — sem interceptor; chat-mentor detecta janela e filtra evidências por `occurred_at`.
- `mem://features/performance/formal-review-rag-completo` — Formal = RAG completo (feedbacks + 1:1s + context_evidence + pulses + 360°) + recaps confirmados como camada de contexto (não espinha única).