# Rhitmo — Auditoria de Custos Operacionais por Líder Ativo

> Gerado em: 15/04/2026  
> Câmbio utilizado: USD 1 = BRL 5,80  
> Atualização: migração para Lovable AI Gateway (Gemini) + Recall.ai Bot + otimizações de custo

---

## 1. O que mudou desde Março 2026

| Mudança | Antes (Mar/26) | Agora (Abr/26) |
|---|---|---|
| **chat-mentor Layer 3** (Resposta RAG) | gpt-4o → $0.026/msg | gemini-2.5-flash (Lovable AI) → **$0.00** |
| **meu-rhitmo** (chat do liderado) | gpt-4o → $0.017/msg | gemini-2.5-flash (Lovable AI) → **$0.00** |
| **Transcrição de reunião** | Whisper (upload manual) $0.006/min | **Recall.ai Bot** (automático) → **~$0.40-0.50/hora** (machine + transcription) |
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

### 2.3 Recall.ai (transcrição automática de reunião) — ATUALIZADO

O Recall.ai cobra **dois componentes** por bot:

| Componente | Descrição | Custo |
|---|---|---|
| **Bot Machine Time** | Tempo total do bot na chamada (da entrada até saída). Inclui sala de espera. | **~$0.25–0.35/hora** |
| **Transcription** | Transcrição via `recallai_streaming` (mode: prioritize_accuracy, language: auto) | **$0.15/hora** |
| **Storage** | Retenção de mídia/recordings | Incluso no free tier (consultar limites) |

> **Custo efetivo por reunião de 30min:** ~$0.20–0.25 (machine time + transcription)
> **Custo efetivo por hora de reunião:** ~$0.40–0.50

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
| **Recall.ai Bot (machine + transcription)** | **10h × $0.45** | **$4.50** |
| Meu Rhitmo (Lovable AI) | 50 × $0.00 | $0.00 |
| Lovable AI (classify, review, brief) | — | $0.00 |
| **TOTAL** | | **$4.53** |

### 4.3 Business (R$69) — 10 liderados, 40 reuniões/mês

| Componente | Cálculo | Custo USD |
|---|---|---|
| Mentor Chat L1 (gpt-4o-mini) | 60 × $0.000048 | $0.003 |
| Mentor Chat L3 (Lovable AI) | 60 × $0.00 | $0.00 |
| Análise de notas (gpt-4o-mini) | 80 × $0.00063 | $0.050 |
| **Recall.ai Bot (machine + transcription)** | **20h × $0.45** | **$9.00** |
| Meu Rhitmo (Lovable AI) | 300 × $0.00 | $0.00 |
| Lovable AI (classify, review, brief) | — | $0.00 |
| **TOTAL** | | **$9.06** |

---

## 5. Tabela Resumo — Custo e Margem por Plano

| Métrica | Pulse (grátis) | Pro (R$49) | Business (R$69) |
|---|---|---|---|
| Custo USD/líder/mês | $0.014 | $4.53 | $9.06 |
| **Custo BRL/líder/mês** | **R$0,08** | **R$26,27** | **R$52,53** |
| Receita/líder/mês | R$0 | R$49 | R$69 |
| **Margem bruta** | **-R$0,08** (subsídio) | **R$22,73 (46,4%)** | **R$16,47 (23,9%)** |

> ⚠️ Com os custos reais do Recall.ai (machine time + transcription), a margem do Business é apertada. As otimizações implementadas (deduplicação, auto-leave, presença do líder) são críticas para manter viabilidade.

### Cenário otimizado (com todas as otimizações ativas)

Estimativa de economia com deduplicação (~30%), auto-leave (~15%), presença líder (~10%):

| Métrica | Pro Otimizado | Business Otimizado |
|---|---|---|
| Recall.ai estimado | 10h × $0.45 × 0.55 = $2.48 | 20h × $0.45 × 0.55 = $4.95 |
| Custo total USD | $2.51 | $5.00 |
| Custo total BRL | R$14,56 | R$29,00 |
| Margem bruta | **R$34,44 (70,3%)** | **R$40,00 (58,0%)** |

### Cenário intenso (power users Pro/Business)

| Parâmetro | Pro Intenso | Business Intenso |
|---|---|---|
| Reuniões com bot/mês | 30 (15h) | 60 (30h) |
| Custo Recall.ai (machine + transcription) | $6.75 | $13.50 |
| Custo total USD | $6.78 | $13.55 |
| Custo total BRL | R$39,32 | R$78,59 |
| Margem bruta | **R$9,68 (19,8%)** | **-R$9,59 (-13,9%)** |

> ⚠️ Power users do Business podem gerar prejuízo. Considerar limite de reuniões/mês ou upgrade de preço.

---

## 6. Análise Real de Consumo (15/04/2026)

Dados reais do dashboard Recall.ai:

| Métrica | Valor |
|---|---|
| Saldo inicial | $5.00 |
| Saldo atual | $3.81 |
| Consumo total | **$1.19** |
| Horas gravadas | **2.377h** |
| Custo efetivo/hora | **~$0.50/h** (machine time + transcription) |

### Problemas identificados e corrigidos

| Problema | Impacto | Correção |
|---|---|---|
| **Bots duplicados** para mesma reunião (dedup falha por `meeting_id` apenas) | ~2x custo em reuniões afetadas | Deduplicação por `meeting_url` como fallback |
| **setTimeout no webhook** não funciona em Deno Edge Functions | Detecção de presença do líder nunca executava | Substituído por verificação síncrona |
| **Sem auto-leave timeouts** | Bot ficava em sala de espera/chamada indefinidamente | `waiting_room_timeout: 120s`, `noone_joined_timeout: 300s` |
| **leader_email ausente** em bots auto-agendados | Presença do líder não podia ser verificada | Adicionado `leader_email` no insert do `fetch-calendar-events` |

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
| Limitar reuniões com bot por plano (ex: 15/mês no Pro) | Controla teto de custo | Pendente |
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

## 9. Break-Even por Plano (cenário otimizado)

| Plano | Custo fixo rateado (10 líderes) | Custo variável | Custo total/líder | Receita | Lucro/líder |
|---|---|---|---|---|---|
| Pro | ~R$17,40 | R$14,56 | R$31,96 | R$49 | **R$17,04 (34,8%)** |
| Business | ~R$17,40 | R$29,00 | R$46,40 | R$69 | **R$22,60 (32,8%)** |

> Com otimizações ativas, a operação é lucrativa a partir de ~7 líderes Pro.

---

## 10. Projeção de Escala — 50 e 100 Líderes Ativos (cenário otimizado)

> Premissas: custo fixo de R$174/mês (~$30 USD × 5.80), mix de 70% Pro + 30% Business, cenário otimizado de uso. Stripe: 3,99% + R$0,39/transação.

### 50 líderes (35 Pro + 15 Business)

| Métrica | Cálculo | Valor |
|---|---|---|
| **Receita bruta** | (35 × R$49) + (15 × R$69) | **R$2.750/mês** |
| Stripe (taxas) | ~4,5% médio | -R$123,75 |
| **Receita líquida** | | **R$2.626,25** |
| Custo variável Pro | 35 × R$14,56 | R$509,60 |
| Custo variável Business | 15 × R$29,00 | R$435,00 |
| **Total custo variável** | | **R$944,60** |
| Custo fixo plataforma | | R$174,00 |
| **Custo total** | | **R$1.118,60** |
| **Lucro líquido mensal** | | **R$1.507,65** |
| **Margem líquida** | | **54,8%** |

### 100 líderes (70 Pro + 30 Business)

| Métrica | Cálculo | Valor |
|---|---|---|
| **Receita bruta** | (70 × R$49) + (30 × R$69) | **R$5.500/mês** |
| Stripe (taxas) | ~4,5% médio | -R$247,50 |
| **Receita líquida** | | **R$5.252,50** |
| Custo variável Pro | 70 × R$14,56 | R$1.019,20 |
| Custo variável Business | 30 × R$29,00 | R$870,00 |
| **Total custo variável** | | **R$1.889,20** |
| Custo fixo plataforma | | R$174,00 |
| **Custo total** | | **R$2.063,20** |
| **Lucro líquido mensal** | | **R$3.189,30** |
| **Margem líquida** | | **60,7%** |

### Resumo visual

| Escala | Receita bruta | Custo total | Lucro líquido | Margem |
|---|---|---|---|---|
| **10 líderes** | R$550 | R$488 | **R$62** | 11,3% |
| **50 líderes** | R$2.750 | R$1.119 | **R$1.508** | 54,8% |
| **100 líderes** | R$5.500 | R$2.063 | **R$3.189** | 60,7% |

> A margem melhora significativamente com escala. Com otimizações e negociação de volume com Recall.ai, a margem em 100 líderes pode ultrapassar 65%.

---

## 11. Notas Técnicas

- **Embeddings:** O schema possui coluna `feedbacks.embedding` (pgvector) mas nenhuma Edge Function popula embeddings atualmente. Custo futuro estimado: ~$0.00002/nota via `text-embedding-3-small`.
- **Layer 2 (Compressor):** Implementado como JavaScript puro (substring/filtragem), sem chamada LLM — custo zero.
- **Whisper (transcribe-audio):** Ainda ativo como fallback para uploads manuais de áudio. Custo: $0.006/min. Fluxo principal agora é via Recall.ai Bot.
- **Recall.ai billing:** Dois componentes — **Machine Time** (tempo do bot na chamada, ~$0.25-0.35/h) e **Transcription** ($0.15/h). Machine time é cobrado desde `joining_call` até `done`, incluindo sala de espera.
- **Recall.ai provider:** `recallai_streaming` com `mode: prioritize_accuracy` e `language_code: auto`. Detecta PT-BR, EN e ES automaticamente.
- **Auto-leave configurado:** `waiting_room_timeout: 120s`, `in_call_not_recording_timeout: 180s`, `noone_joined_timeout: 300s`.
- **Resend:** Dentro do free tier (3k emails/mês). Acima disso: ~$0.001/email.
- **Lovable AI Gateway:** Todas as funções que usam o gateway têm custo zero adicional. Modelos utilizados: `gemini-2.5-flash` e `gemini-3-flash-preview`.
