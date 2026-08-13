# Rhitmo — Auditoria de Custos Operacionais por Líder Ativo

> Gerado em: 15/04/2026 · Revisado em: 13/08/2026 com a fatura real do Recall.ai (V1R4A6KP-0006, Jul/2026)  
> Câmbio utilizado: USD 1 = BRL 5,80  
> Atualização: custo efetivo do Recall corrigido de $0.45/h para **$0.72/h** (machine time $0.50/h + transcrição + storage)

---

## 1. O que mudou desde Março 2026

| Mudança | Antes (Mar/26) | Agora (Abr/26) |
|---|---|---|
| **chat-mentor Layer 3** (Resposta RAG) | gpt-4o → $0.026/msg | gemini-2.5-flash (Lovable AI) → **$0.00** |
| **meu-rhitmo** (chat do liderado) | gpt-4o → $0.017/msg | gemini-2.5-flash (Lovable AI) → **$0.00** |
| **Transcrição de reunião** | Whisper (upload manual) $0.006/min | **Recall.ai Bot** (automático) → **~$0.72/hora** (machine + transcription + storage, fatura real Jul/26) |
| **generate-review, classify-note, generate-brief, analyze-job-crafting** | Lovable AI → $0.00 | Sem mudança → $0.00 |

**Resultado:** custo variável de LLM caiu **~98%**. O driver de custo agora é exclusivamente o Recall.ai (machine time + transcrição).

---

## 2. Custos Unitários por Operação (Abril 2026)

### 2.1 OpenAI (custo direto — apenas roteamento e análise leve)

| Operação | Modelo | Tokens Input | Tokens Output | Custo Unitário (USD) |
|---|---|---|---|---|
| **chat-mentor — Layer 1** (Router Semântico) | gpt-4o-mini | ~300 | ~5 | $0.000048 |
| **chat-mentor — Layer 2** (Compressor) | JavaScript puro | — | — | $0.00 |
| **analyze-feedback-background** (análise de nota) | gpt-4o-mini | ~3.000 | ~300 | $0.00063 |
| **extract-text-vision** (OCR de imagem) | gpt-4o | ~500 | ~200 | ~$0.01 |
| **transcribe-audio** (upload manual, legado) | whisper-1 | N/A | N/A | $0.006/min |

> **Preços OpenAI utilizados (Abril 2026):**
> - gpt-4o: $2.50/1M input, $10.00/1M output
> - gpt-4o-mini: $0.15/1M input, $0.60/1M output
> - whisper-1: $0.006/minuto de áudio

### 2.2 Lovable AI Gateway (incluso no plano Lovable — custo zero)

| Operação | Modelo | Custo |
|---|---|---|
| **chat-mentor — Layer 3** (Resposta RAG) | gemini-2.5-flash | **$0.00** ✅ |
| **meu-rhitmo** (chat do liderado) | gemini-2.5-flash | **$0.00** ✅ |
| **classify-note** (classificação de nota) | gemini-2.5-flash | $0.00 |
| **generate-review** (avaliação de desempenho) | gemini-2.5-flash | $0.00 |
| **generate-brief** (brief pré-reunião) | gemini-3-flash-preview | $0.00 |
| **analyze-job-crafting** (perfil de trabalho) | gemini-3-flash-preview | $0.00 |

### 2.3 Recall.ai — REVISADO com fatura real (Jul/2026)

O Recall.ai cobra **três componentes** por bot (confirmado na fatura V1R4A6KP-0006):

| Componente | Descrição | Custo |
|---|---|---|
| **Bot Recording Hours** (machine time) | Tempo total do bot na chamada, da entrada até a saída. Inclui sala de espera. | **$0.50/hora** |
| **Real-time Transcription** | Transcrição via `recallai_streaming` (mode: prioritize_accuracy, language: auto) | **$0.15/hora gravada** |
| **Storage and Playback** | Retenção de mídia/recordings. **Não é grátis** e é cumulativo. | **$0.0000694444/unidade** (~16% da conta em Jul/26) |

> **Custo efetivo por hora de bot (fatura real Jul/2026):** **$0.72/h**
> **Custo efetivo por reunião de 30min:** ~$0.36
> Detalhamento em §6. O modelo anterior ($0.45/h) subestimava o custo em ~60%.



#### Otimizações implementadas (15/04/2026)

| Otimização | Descrição | Economia estimada |
|---|---|---|
| **Deduplicação por URL** | Fallback check por `meeting_url` além de `meeting_id`, evitando bots duplicados para reuniões recorrentes | ~30-50% (eliminação de bots duplicados) |
| **Auto-leave timeouts** | `waiting_room_timeout: 120s`, `in_call_not_recording_timeout: 180s`, `noone_joined_timeout: 300s` | ~10-20% (redução de machine time ocioso) |
| **Detecção de presença do líder** | Bot verifica se o líder está na reunião; se não, marca como `skipped_no_leader` e descarta transcrição | ~10-15% (evita transcrições sem valor) |
| **Correção do setTimeout** | Webhook usava `setTimeout` que não funciona em Deno Edge Functions — substituído por verificação síncrona | Correção funcional (presença agora funciona) |

### 2.4 Supabase (Lovable Cloud)

| Recurso | Custo |
|---|---|
| Database (Postgres + pgvector) | $0.00 (incluso) |
| Edge Function invocations | $0.00 (incluso) |
| Realtime connections | $0.00 (incluso) |
| Storage (meeting-recordings) | $0.00 (incluso) |

### 2.5 Resend (emails transacionais)

| Recurso | Custo |
|---|---|
| Emails transacionais | $0.00 (free tier: 3.000/mês) |

---

## 3. Premissas de Uso por Plano

| Parâmetro | Pulse (grátis) | Pro (R$49) | Business (R$69) |
|---|---|---|---|
| Liderados ativos | 2 | 5 | 10 |
| Notas/mês | 20 | 40 | 80 |
| Msgs Mentor Chat (líder)/mês | 20 | 60 | 60 |
| **Reuniões com bot/mês** | **0** | **20** (1/liderado/semana) | **40** (1/liderado/semana) |
| Duração média reunião | — | 30 min | 30 min |
| **Horas transcrição/mês** | **0h** | **10h** | **20h** |
| Avaliações/período | 0 | 1/mês | 3/mês |
| Msgs Meu Rhitmo/liderado/mês | 0 | 10 | 30 |
| Acesso ao Meu Rhitmo | Não | Sim | Sim |

---

## 4. Custos Detalhados por Plano

### 4.1 Pulse (grátis) — 2 liderados, sem bot

| Componente | Cálculo | Custo USD |
|---|---|---|
| Mentor Chat L1 (gpt-4o-mini) | 20 × $0.000048 | $0.001 |
| Mentor Chat L3 (Lovable AI) | 20 × $0.00 | $0.00 |
| Análise de notas (gpt-4o-mini) | 20 × $0.00063 | $0.013 |
| Recall.ai Bot | 0h | $0.00 |
| Meu Rhitmo | N/A | $0.00 |
| Lovable AI (classify, review, brief) | — | $0.00 |
| **TOTAL** | | **$0.014** |

### 4.2 Pro (R$49) — 5 liderados, 20 reuniões/mês

| Componente | Cálculo | Custo USD |
|---|---|---|
| Mentor Chat L1 (gpt-4o-mini) | 60 × $0.000048 | $0.003 |
| Mentor Chat L3 (Lovable AI) | 60 × $0.00 | $0.00 |
| Análise de notas (gpt-4o-mini) | 40 × $0.00063 | $0.025 |
| **Recall.ai (machine + transcription + storage)** | **10h × $0.72** | **$7.22** |
| Meu Rhitmo (Lovable AI) | 50 × $0.00 | $0.00 |
| Lovable AI (classify, review, brief) | — | $0.00 |
| **TOTAL** | | **$7.25** |

### 4.3 Business (R$69) — 10 liderados, 40 reuniões/mês

| Componente | Cálculo | Custo USD |
|---|---|---|
| Mentor Chat L1 (gpt-4o-mini) | 60 × $0.000048 | $0.003 |
| Mentor Chat L3 (Lovable AI) | 60 × $0.00 | $0.00 |
| Análise de notas (gpt-4o-mini) | 80 × $0.00063 | $0.050 |
| **Recall.ai (machine + transcription + storage)** | **20h × $0.72** | **$14.44** |
| Meu Rhitmo (Lovable AI) | 300 × $0.00 | $0.00 |
| Lovable AI (classify, review, brief) | — | $0.00 |
| **TOTAL** | | **$14.49** |

---

## 5. Tabela Resumo — Custo e Margem por Plano

| Métrica | Pulse (grátis) | Pro (R$49) | Business (R$69) |
|---|---|---|---|
| Custo USD/líder/mês | $0.014 | $7.25 | $14.49 |
| **Custo BRL/líder/mês** | **R$0,08** | **R$42,05** | **R$84,04** |
| Receita/líder/mês | R$0 | R$49 | R$69 |
| **Margem bruta** | **-R$0,08** (subsídio) | **R$6,95 (14,2%)** | **-R$15,04 (-21,8%)** |

> 🚨 Com o custo real de $0.72/h (fatura Jul/2026), o **Business dá prejuízo** na premissa de uso plena e o Pro fica com margem de 14%. As otimizações (deduplicação, auto-leave, presença do líder) deixaram de ser "melhoria" e passaram a ser **condição de viabilidade**, e um **teto de horas de bot por plano** vira obrigatório.

### Cenário otimizado (com todas as otimizações ativas)

Estimativa de economia com deduplicação (~30%), auto-leave (~15%), presença líder (~10%) → uso efetivo de 55%:

| Métrica | Pro Otimizado | Business Otimizado |
|---|---|---|
| Recall.ai estimado | 5,5h × $0.72 = $3.97 | 11h × $0.72 = $7.94 |
| Custo total USD | $3.99 | $7.99 |
| Custo total BRL | R$23,16 | R$46,36 |
| Margem bruta | **R$25,84 (52,7%)** | **R$22,64 (32,8%)** |

### Cenário intenso (power users Pro/Business)

| Parâmetro | Pro Intenso | Business Intenso |
|---|---|---|
| Reuniões com bot/mês | 30 (15h) | 60 (30h) |
| Custo Recall.ai | $10.83 | $21.66 |
| Custo total USD | $10.86 | $21.71 |
| Custo total BRL | R$62,99 | R$125,92 |
| Margem bruta | **-R$13,99 (-28,6%)** | **-R$56,92 (-82,5%)** |

> 🚨 Power users **de qualquer plano pago** geram prejuízo sem teto de horas. Teto sugerido: 12h/mês no Pro e 24h/mês no Business (com aviso ao líder e opção de comprar horas extras).

---

## 6. Análise Real de Consumo — Fatura Jul/2026 (V1R4A6KP-0006)

Primeira fatura fechada com volume relevante. Serviço Jul 01–31/2026:

| Linha | Quantidade | Preço unitário | Valor |
|---|---|---|---|
| Bot Recording Hours | 9,4256 h | $0.50/h | $4.71 |
| Storage and Playback | 15.756,97 unidades | $0.0000694444 | $1.09 |
| Real-time Transcription | 6,6342 h | $0.15/h | $1.00 |
| Crédito pré-pago aplicado | — | — | -$6.18 |
| **Bruto do mês** | | | **$6.80** |
| Amount due (após créditos) | | | $0.61 |

### Leituras da fatura

| # | Achado | Implicação |
|---|---|---|
| 1 | **Machine time é $0.50/h fixo**, não a faixa $0.25–0.35 documentada antes | Base de custo 43–100% maior que o modelado |
| 2 | **Storage and Playback não é grátis** ($1.09, ~16% da conta) e é **cumulativo** | Cresce mês a mês mesmo com volume estável → exige política de retenção |
| 3 | **Transcrição cobre só 70% das horas de bot** (6,63h de 9,43h) | ~30% do machine time é bot ocioso: sala de espera, reunião sem gravação |
| 4 | **Custo efetivo: $0.72/h de bot** ($6.80 ÷ 9,4256h) | ~60% acima dos $0.45/h assumidos |

### KPI de eficiência: razão transcrição / machine time

`horas transcritas ÷ horas de bot` — em Jul/2026: **70,4%**.

Quanto mais perto de 100%, menos bot ocioso pago. Metas: <70% investigar auto-leave e agendamentos fantasma; >85% saudável. Este é o indicador mais barato de acompanhar mensalmente na fatura.

### Problemas identificados e corrigidos

| Problema | Impacto | Correção |
|---|---|---|
| **Bots duplicados** para mesma reunião (dedup falha por `meeting_id` apenas) | ~2x custo em reuniões afetadas | Deduplicação por `meeting_url` como fallback |
| **setTimeout no webhook** não funciona em Deno Edge Functions | Detecção de presença do líder nunca executava | Substituído por verificação síncrona |
| **Sem auto-leave timeouts** | Bot ficava em sala de espera/chamada indefinidamente | `waiting_room_timeout`, `noone_joined_timeout: 300s` |
| **leader_email ausente** em bots auto-agendados | Presença do líder não podia ser verificada | Adicionado `leader_email` no insert do `fetch-calendar-events` |
| **Storage tratado como grátis** | Custo invisível de ~16% da conta, cumulativo | Pendente: política de retenção/expurgo de gravações |

---

## 7. Maiores Drivers de Custo (Abril 2026)

| # | Driver | % do custo total (Pro moderado) |
|---|---|---|
| 1 | **Recall.ai Bot** (machine time + transcription) | **~99%** |
| 2 | Análise de notas (gpt-4o-mini) | ~0.6% |
| 3 | Router semântico (gpt-4o-mini) | ~0.1% |
| 4 | Lovable AI (tudo mais) | 0% |

### Oportunidades de otimização

| Ação | Economia estimada | Status |
|---|---|---|
| ✅ Deduplicação por `meeting_url` | ~30-50% | **Implementado** |
| ✅ Auto-leave timeouts (waiting room, idle, alone) | ~10-20% | **Implementado** |
| ✅ Detecção de presença do líder | ~10-15% | **Implementado** |
| ✅ Correção do `setTimeout` no webhook | Funcional | **Implementado** |
| **Teto de horas de bot por plano** (12h Pro / 24h Business) | Impede prejuízo em power user | **Pendente — prioridade 1** |
| **Política de retenção/expurgo de gravações** | ~16% da conta (storage cumulativo) | **Pendente — prioridade 2** |
| Reduzir duração mínima de gravação (ignorar <5min) | ~5-10% do Recall.ai | Pendente |
| Negociar volume com Recall.ai | ~10-30% no componente | Requer escala |

---

## 8. Custos Fixos Mensais da Plataforma

| Serviço | Custo/mês |
|---|---|
| Lovable (Pro plan) | ~$20/mês |
| Lovable Cloud (Supabase) | $25 free credit/mês |
| Recall.ai | Pay-as-you-go (sem fixo) |
| OpenAI | Pay-as-you-go (sem fixo) |
| Resend | Free tier (3k emails) |
| Stripe | 3,99% + R$0,39 por transação |
| Google Calendar OAuth | Grátis |
| Slack API | Grátis |
| Domínio + DNS | ~$15/ano (~$1,25/mês) |
| **TOTAL fixo estimado** | **~$20–45/mês** |

---

## 9. Break-Even por Plano (cenário otimizado, custo real $0.72/h)

| Plano | Custo fixo rateado (10 líderes) | Custo variável | Custo total/líder | Receita | Lucro/líder |
|---|---|---|---|---|---|
| Pro | ~R$17,40 | R$23,16 | R$40,56 | R$49 | **R$8,44 (17,2%)** |
| Business | ~R$17,40 | R$46,36 | R$63,76 | R$69 | **R$5,24 (7,6%)** |

> Com o custo real, o break-even só existe **no cenário otimizado**. Em uso pleno (10h/20h) o Business é negativo. A operação continua lucrativa a partir de ~7 líderes Pro, mas com folga bem menor do que a estimada antes.

---

## 10. Projeção de Escala — 50 e 100 Líderes Ativos (cenário otimizado)

> Premissas: custo fixo de R$174/mês (~$30 USD × 5.80), mix de 70% Pro + 30% Business, cenário otimizado de uso (55% das horas), Recall a $0.72/h. Stripe: 3,99% + R$0,39/transação.

### 50 líderes (35 Pro + 15 Business)

| Métrica | Cálculo | Valor |
|---|---|---|
| **Receita bruta** | (35 × R$49) + (15 × R$69) | **R$2.750/mês** |
| Stripe (taxas) | ~4,5% médio | -R$123,75 |
| **Receita líquida** | | **R$2.626,25** |
| Custo variável Pro | 35 × R$23,16 | R$810,60 |
| Custo variável Business | 15 × R$46,36 | R$695,40 |
| **Total custo variável** | | **R$1.506,00** |
| Custo fixo plataforma | | R$174,00 |
| **Custo total** | | **R$1.680,00** |
| **Lucro líquido mensal** | | **R$946,25** |
| **Margem líquida** | | **34,4%** |

### 100 líderes (70 Pro + 30 Business)

| Métrica | Cálculo | Valor |
|---|---|---|
| **Receita bruta** | (70 × R$49) + (30 × R$69) | **R$5.500/mês** |
| Stripe (taxas) | ~4,5% médio | -R$247,50 |
| **Receita líquida** | | **R$5.252,50** |
| Custo variável Pro | 70 × R$23,16 | R$1.621,20 |
| Custo variável Business | 30 × R$46,36 | R$1.390,80 |
| **Total custo variável** | | **R$3.012,00** |
| Custo fixo plataforma | | R$174,00 |
| **Custo total** | | **R$3.186,00** |
| **Lucro líquido mensal** | | **R$2.066,50** |
| **Margem líquida** | | **37,6%** |

### Resumo visual

| Escala | Receita bruta | Custo total | Lucro líquido | Margem |
|---|---|---|---|---|
| **10 líderes** (7 Pro + 3 Business) | R$550 | R$475 | **~R$50** | 9,1% |
| **50 líderes** | R$2.750 | R$1.680 | **R$946** | 34,4% |
| **100 líderes** | R$5.500 | R$3.186 | **R$2.067** | 37,6% |

> Com o custo real, a margem em escala cai de ~60% para ~37%. As duas alavancas que devolvem margem são **teto de horas por plano** e **negociação de volume com o Recall** (o preço de $0.50/h já é `prepaid_commit`; volume maior tende a reduzir). Uma terceira alavanca é reprecificar o Business, que hoje só se sustenta em uso moderado.

---

## 11. Pricing v4 — assento previsível + teto de horas (Ago/2026)

Modelo em vigor, calibrado com o custo real de **$0.72/h de bot** (~R$ 4,20/h a 5,80).

| Item | Valor |
|---|---|
| Grátis | 3 assentos, **4 h de bot/mês por workspace** |
| Pago (mensal) | **R$ 59,90 por assento** além dos 3 grátis |
| Pago (anual) | R$ 47,90/assento/mês (R$ 574,80/ano) — 20% off |
| Horas incluídas no pago | **8 h base + 4 h por assento pago** |
| Pacote extra | 5 h por R$ 39 |
| Hora avulsa | R$ 8 |

Margem por assento pago (R$ 59,90 com 4 h atribuíveis ≈ R$ 16,80 de Recall): **~70%**. O pacote extra (R$ 7,80/h) e a hora avulsa (R$ 8) ficam acima do custo (R$ 4,20/h), então excedente não corrói margem.

**Enforcement:** `schedule-recall-bot` bloqueia novo bot com `403 recall_hours_cap` quando as horas do mês (soma de `bot_usage_events.machine_minutes` do workspace) atingem o teto. Beta e workspaces grandfathered ficam sem teto. Uploads, notas e Slack seguem liberados — o teto vale só para o bot.

**Medição:** `bot_usage_events` (populada pelo `recall-webhook` com a janela real de gravação) alimenta o relatório da aba **Custos** no `/admin`, com horas, razão transcrição/machine e custo em USD/BRL por usuário e workspace.

**Retenção:** cron diário `purge-recall-recordings-daily` (03:45 UTC) apaga no Recall a mídia de bots com mais de **90 dias** (`recall_bots.media_purged_at`). Contém o storage cumulativo — as transcrições já vivem no nosso banco, então nada é perdido para o líder.

---

## 12. Notas Técnicas


- **Embeddings:** O schema possui coluna `feedbacks.embedding` (pgvector) mas nenhuma Edge Function popula embeddings atualmente. Custo futuro estimado: ~$0.00002/nota via `text-embedding-3-small`.
- **Layer 2 (Compressor):** Implementado como JavaScript puro (substring/filtragem), sem chamada LLM — custo zero.
- **Whisper (transcribe-audio):** Ainda ativo como fallback para uploads manuais de áudio. Custo: $0.006/min. Fluxo principal agora é via Recall.ai Bot.
- **Recall.ai billing (fatura Jul/2026):** Três componentes — **Bot Recording Hours** ($0.50/h, cobrado de `joining_call` até `done`, incluindo sala de espera), **Real-time Transcription** ($0.15/h gravada) e **Storage and Playback** ($0.0000694444/unidade, cumulativo). Custo efetivo combinado: **$0.72 por hora de bot**.
- **Razão transcrição/machine time:** KPI mensal de eficiência. Jul/2026 = 70,4%. Abaixo de 70% indica bot ocioso demais (sala de espera, reunião sem gravação).
- **Recall.ai provider:** `recallai_streaming` com `mode: prioritize_accuracy` e `language_code: auto`. Detecta PT-BR, EN e ES automaticamente.
- **Auto-leave configurado:** `waiting_room_timeout: 120s`, `in_call_not_recording_timeout: 180s`, `noone_joined_timeout: 300s`.
- **Resend:** Dentro do free tier (3k emails/mês). Acima disso: ~$0.001/email.
- **Lovable AI Gateway:** Todas as funções que usam o gateway têm custo zero adicional. Modelos utilizados: `gemini-2.5-flash` e `gemini-3-flash-preview`.
