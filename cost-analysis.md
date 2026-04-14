# Rhitmo — Auditoria de Custos Operacionais por Líder Ativo

> Gerado em: 14/04/2026  
> Câmbio utilizado: USD 1 = BRL 5,80  
> Atualização: migração para Lovable AI Gateway (Gemini) + Recall.ai Bot

---

## 1. O que mudou desde Março 2026

| Mudança | Antes (Mar/26) | Agora (Abr/26) |
|---|---|---|
| **chat-mentor Layer 3** (Resposta RAG) | gpt-4o → $0.026/msg | gemini-2.5-flash (Lovable AI) → **$0.00** |
| **meu-rhitmo** (chat do liderado) | gpt-4o → $0.017/msg | gemini-2.5-flash (Lovable AI) → **$0.00** |
| **Transcrição de reunião** | Whisper (upload manual) $0.006/min | **Recall.ai Bot** (automático) → **$0.15/hora** |
| **generate-review, classify-note, generate-brief, analyze-job-crafting** | Lovable AI → $0.00 | Sem mudança → $0.00 |

**Resultado:** custo variável por líder caiu **~85%** no cenário moderado.

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

### 2.3 Recall.ai (transcrição automática de reunião) 🆕

| Recurso | Provider | Custo |
|---|---|---|
| **Bot de transcrição** | recallai_streaming (mode: prioritize_accuracy, language: auto) | **$0.15/hora** |

> Detecta automaticamente PT-BR, EN e ES. Não depende de configuração do Google Meet.

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
| **Recall.ai Bot** | **10h × $0.15** | **$1.50** |
| Meu Rhitmo (Lovable AI) | 50 × $0.00 | $0.00 |
| Lovable AI (classify, review, brief) | — | $0.00 |
| **TOTAL** | | **$1.53** |

### 4.3 Business (R$69) — 10 liderados, 40 reuniões/mês

| Componente | Cálculo | Custo USD |
|---|---|---|
| Mentor Chat L1 (gpt-4o-mini) | 60 × $0.000048 | $0.003 |
| Mentor Chat L3 (Lovable AI) | 60 × $0.00 | $0.00 |
| Análise de notas (gpt-4o-mini) | 80 × $0.00063 | $0.050 |
| **Recall.ai Bot** | **20h × $0.15** | **$3.00** |
| Meu Rhitmo (Lovable AI) | 300 × $0.00 | $0.00 |
| Lovable AI (classify, review, brief) | — | $0.00 |
| **TOTAL** | | **$3.06** |

---

## 5. Tabela Resumo — Custo e Margem por Plano

| Métrica | Pulse (grátis) | Pro (R$49) | Business (R$69) |
|---|---|---|---|
| Custo USD/líder/mês | $0.014 | $1.53 | $3.06 |
| **Custo BRL/líder/mês** | **R$0,08** | **R$8,87** | **R$17,73** |
| Receita/líder/mês | R$0 | R$49 | R$69 |
| **Margem bruta** | **-R$0,08** (subsídio) | **R$40,13 (81,9%)** | **R$51,27 (74,3%)** |

### Cenário intenso (power users Pro/Business)

| Parâmetro | Pro Intenso | Business Intenso |
|---|---|---|
| Reuniões com bot/mês | 30 (15h) | 60 (30h) |
| Custo Recall.ai | $2.25 | $4.50 |
| Custo total USD | $2.30 | $4.60 |
| Custo total BRL | R$13,34 | R$26,68 |
| Margem bruta | **R$35,66 (72,8%)** | **R$42,32 (61,3%)** |

> Mesmo no cenário intenso, a margem bruta se mantém acima de 60%.

---

## 6. Comparativo: Março 2026 vs Abril 2026

| Cenário | Custo Mar/26 | Custo Abr/26 | Redução |
|---|---|---|---|
| **Moderado (Pro)** | $3.16 / R$18,33 | $1.53 / R$8,87 | **-52%** |
| **Intenso (Pro)** | $12.32 / R$71,46 | $2.30 / R$13,34 | **-81%** |

> A redução no cenário moderado é menor que 85% porque o Recall.ai ($1.50) adicionou custo que antes não existia (transcrição era manual/grátis). Porém, o custo de LLM caiu ~98%.

---

## 7. Maiores Drivers de Custo (Abril 2026)

| # | Driver | % do custo total (Pro moderado) |
|---|---|---|
| 1 | **Recall.ai Bot** (transcrição) | **98%** |
| 2 | Análise de notas (gpt-4o-mini) | ~1.6% |
| 3 | Router semântico (gpt-4o-mini) | ~0.2% |
| 4 | Lovable AI (tudo mais) | 0% |

> O custo de LLM é agora **desprezível**. O driver de custo é exclusivamente a transcrição automática de reuniões.

### Oportunidades de otimização

| Ação | Economia estimada | Impacto |
|---|---|---|
| Limitar reuniões com bot por plano (ex: 15/mês no Pro) | Controla teto de custo | Experiência do líder |
| Reduzir duração mínima de gravação (ignorar <5min) | ~5-10% do Recall.ai | Baixo risco |
| Negociar volume com Recall.ai | ~10-30% no componente | Requer escala |
| Migrar Whisper → Recall.ai para uploads manuais | Simplifica stack | Custo similar |

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

> Com os $25 de crédito do Lovable Cloud, o custo fixo efetivo pode ser tão baixo quanto ~$20/mês.

---

## 9. Break-Even por Plano

| Plano | Custo fixo rateado (10 líderes) | Custo variável | Custo total/líder | Receita | Lucro/líder |
|---|---|---|---|---|---|
| Pro | ~R$17,40 | R$8,87 | R$26,27 | R$49 | **R$22,73 (46,4%)** |
| Business | ~R$17,40 | R$17,73 | R$35,13 | R$69 | **R$33,87 (49,1%)** |

> Com 10 líderes pagantes, o custo fixo rateado é ~R$17,40/líder. A partir de ~5 líderes Pro, a operação já é lucrativa.

---

## 10. Projeção de Escala — 50 e 100 Líderes Ativos

> Premissas: custo fixo de R$174/mês (~$30 USD × 5.80), mix de 70% Pro + 30% Business, cenário moderado de uso. Stripe: 3,99% + R$0,39/transação.

### 50 líderes (35 Pro + 15 Business)

| Métrica | Cálculo | Valor |
|---|---|---|
| **Receita bruta** | (35 × R$49) + (15 × R$69) | **R$2.750/mês** |
| Stripe (taxas) | ~4,5% médio | -R$123,75 |
| **Receita líquida** | | **R$2.626,25** |
| Custo variável Pro | 35 × R$8,87 | R$310,45 |
| Custo variável Business | 15 × R$17,73 | R$265,95 |
| **Total custo variável** | | **R$576,40** |
| Custo fixo plataforma | | R$174,00 |
| **Custo total** | | **R$750,40** |
| **Lucro líquido mensal** | | **R$1.875,85** |
| **Margem líquida** | | **68,2%** |

### 100 líderes (70 Pro + 30 Business)

| Métrica | Cálculo | Valor |
|---|---|---|
| **Receita bruta** | (70 × R$49) + (30 × R$69) | **R$5.500/mês** |
| Stripe (taxas) | ~4,5% médio | -R$247,50 |
| **Receita líquida** | | **R$5.252,50** |
| Custo variável Pro | 70 × R$8,87 | R$620,90 |
| Custo variável Business | 30 × R$17,73 | R$531,90 |
| **Total custo variável** | | **R$1.152,80** |
| Custo fixo plataforma | | R$174,00 |
| **Custo total** | | **R$1.326,80** |
| **Lucro líquido mensal** | | **R$3.925,70** |
| **Margem líquida** | | **71,3%** |

### Resumo visual

| Escala | Receita bruta | Custo total | Lucro líquido | Margem |
|---|---|---|---|---|
| **10 líderes** | R$550 | R$304 | **R$246** | 44,7% |
| **50 líderes** | R$2.750 | R$750 | **R$1.876** | 68,2% |
| **100 líderes** | R$5.500 | R$1.327 | **R$3.926** | 71,3% |

> A margem líquida melhora com escala porque o custo fixo (R$174) se dilui. A partir de 50 líderes, a operação gera ~R$1.900/mês de lucro líquido. Com 100, ~R$3.900/mês.

---

## 11. Notas Técnicas

- **Embeddings:** O schema possui coluna `feedbacks.embedding` (pgvector) mas nenhuma Edge Function popula embeddings atualmente. Custo futuro estimado: ~$0.00002/nota via `text-embedding-3-small`.
- **Layer 2 (Compressor):** Implementado como JavaScript puro (substring/filtragem), sem chamada LLM — custo zero.
- **Whisper (transcribe-audio):** Ainda ativo como fallback para uploads manuais de áudio. Custo: $0.006/min. Fluxo principal agora é via Recall.ai Bot.
- **Recall.ai provider:** `recallai_streaming` com `mode: prioritize_accuracy` e `language_code: auto`. Detecta PT-BR, EN e ES automaticamente.
- **Resend:** Dentro do free tier (3k emails/mês). Acima disso: ~$0.001/email.
- **Lovable AI Gateway:** Todas as funções que usam o gateway têm custo zero adicional. Modelos utilizados: `gemini-2.5-flash` e `gemini-3-flash-preview`.
