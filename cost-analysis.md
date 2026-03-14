# Rhitmo — Auditoria de Custos Operacionais por Líder Ativo

> Gerado em: 14/03/2026  
> Câmbio utilizado: USD 1 = BRL 5,80

---

## 1. Custos Unitários por Operação

### 1.1 OpenAI (custo direto)

| Operação | Modelo | Tokens Input | Tokens Output | Custo Unitário (USD) |
|---|---|---|---|---|
| **chat-mentor — Layer 1** (Router Semântico) | gpt-4o-mini | ~300 | ~5 | $0.000048 |
| **chat-mentor — Layer 2** (Compressor) | JavaScript puro | — | — | $0.00 |
| **chat-mentor — Layer 3** (Resposta RAG) | gpt-4o | ~7.250 | ~800 | $0.0261 |
| **chat-mentor TOTAL por mensagem** | — | — | — | **$0.0262** |
| **meu-rhitmo** (chat do liderado) | gpt-4o | ~3.600 | ~800 | **$0.0170** |
| **analyze-feedback-background** (análise de nota) | gpt-4o-mini | ~3.000 | ~300 | **$0.00063** |
| **transcribe-audio** (Whisper) | whisper-1 | N/A | N/A | **$0.006/min** |

> **Preços OpenAI utilizados (Março 2026):**
> - gpt-4o: $2.50/1M input, $10.00/1M output
> - gpt-4o-mini: $0.15/1M input, $0.60/1M output
> - whisper-1: $0.006/minuto de áudio

### 1.2 Lovable AI Gateway (incluso no plano Lovable)

| Operação | Modelo | Tokens Input | Tokens Output | Custo |
|---|---|---|---|---|
| **classify-note** (classificação de nota) | gemini-2.5-flash | ~2.500 | ~100 | $0.00 |
| **generate-review** (avaliação de desempenho) | gemini-2.5-flash | ~8.000 | ~2.000 | $0.00 |
| **generate-brief** (brief pré-reunião) | gemini-3-flash-preview | ~2.000 | ~500 | $0.00 |
| **analyze-job-crafting** (perfil de trabalho) | gemini-3-flash-preview | ~1.500 | ~300 | $0.00 |

> Todas as chamadas via Lovable AI Gateway estão inclusas no plano Lovable — custo operacional zero.

### 1.3 Supabase (Lovable Cloud)

| Recurso | Estimativa | Custo |
|---|---|---|
| Database (Postgres + pgvector) | Incluso no Lovable Cloud | $0.00 |
| Edge Function invocations | Incluso | $0.00 |
| Realtime connections | Incluso | $0.00 |
| Storage (meeting-recordings) | Incluso (dentro dos limites) | $0.00 |
| Bandwidth | Incluso | $0.00 |

> **Nota:** O campo `feedbacks.embedding` existe no schema mas **nenhuma Edge Function gera embeddings atualmente**. Quando implementado, haverá custo adicional de ~$0.00002/nota via `text-embedding-3-small`.

### 1.4 Resend (emails transacionais)

| Evento | Custo |
|---|---|
| Convite Rhitmo Sync | $0.00 (free tier) |
| Notificação avaliação compartilhada | $0.00 (free tier) |

> Free tier: 3.000 emails/mês — suficiente para ~500 líderes ativos.

---

## 2. Cenários de Uso por Líder/Mês

### Premissas dos cenários

| Parâmetro | Leve | Moderado | Intenso |
|---|---|---|---|
| Liderados ativos | 2 | 5 | 10 |
| Notas/mês | 20 | 40 | 80 |
| Msgs Mentor Chat (líder)/mês | 15 | 60 | 150 |
| Gravações/mês | 0 | 4 (30min) | 12 (45min) |
| Avaliações/período | 1/trimestre | 1/mês | 3/mês |
| Msgs Meu Rhitmo/liderado/mês | 0 | 10 | 30 |

### Custos detalhados por componente

| Componente | Cálculo Leve | Cálculo Moderado | Cálculo Intenso |
|---|---|---|---|
| **Mentor Chat** (OpenAI) | 15 × $0.0262 = **$0.39** | 60 × $0.0262 = **$1.57** | 150 × $0.0262 = **$3.93** |
| **Meu Rhitmo** (OpenAI) | 0 × $0.0170 = **$0.00** | 50 × $0.0170 = **$0.85** | 300 × $0.0170 = **$5.10** |
| **Análise de notas** (OpenAI) | 20 × $0.00063 = **$0.013** | 40 × $0.00063 = **$0.025** | 80 × $0.00063 = **$0.050** |
| **Whisper transcrição** | 0 min = **$0.00** | 120 min × $0.006 = **$0.72** | 540 min × $0.006 = **$3.24** |
| **Lovable AI** (classify, review, brief, job-crafting) | **$0.00** | **$0.00** | **$0.00** |
| **Supabase** (Lovable Cloud) | **incluso** | **incluso** | **incluso** |
| **Resend** (emails) | **$0.00** | **$0.00** | **$0.00** |

### Tabela Resumo

| Componente | Leve | Moderado | Intenso |
|---|---|---|---|
| OpenAI | $0.40 | $3.16 | $12.32 |
| Supabase | $0.00 | $0.00 | $0.00 |
| Resend | $0.00 | $0.00 | $0.00 |
| **TOTAL USD/líder/mês** | **$0.40** | **$3.16** | **$12.32** |
| **TOTAL BRL/líder/mês** | **R$2,34** | **R$18,33** | **R$71,46** |
| **Com margem 2x** | **R$4,68** | **R$36,66** | **R$142,92** |

---

## 3. Margem de Segurança

Recomenda-se aplicar **margem 2x** sobre o custo base para absorver:

- Picos de uso acima da média
- Usuários power-users (acima do cenário estimado)
- Flutuações cambiais USD/BRL
- Eventuais reajustes de preços da OpenAI
- Custos de Supabase ao ultrapassar free tier em escala

---

## 4. Ponto de Break-Even por Plano

| Cenário | Custo base | Com margem 2x | Com margem 3x (lucro saudável) |
|---|---|---|---|
| Leve | R$2,34 | R$4,68 | R$7,02 |
| **Moderado** | **R$18,33** | **R$36,66** | **R$55,00** |
| Intenso | R$71,46 | R$142,92 | R$214,38 |

### Recomendação de precificação

> **Para cobrir custos no cenário moderado com margem 2x, o preço mínimo por líder/mês é R$36,66.**
>
> Com margem de lucro saudável (3x): **R$55/líder/mês.**

---

## 5. Maiores Drivers de Custo

1. **Whisper (transcrição de áudio)** — $3.24/líder no cenário intenso (26% do total). Maior custo unitário por operação.
2. **Meu Rhitmo (gpt-4o)** — $5.10/líder no cenário intenso (41% do total). Volume de mensagens de liderados é o principal multiplicador.
3. **Mentor Chat (gpt-4o)** — $3.93/líder no cenário intenso (32% do total). Pipeline de 3 camadas mas custo concentrado na Layer 3.

### Oportunidades de otimização

| Ação | Economia estimada | Impacto |
|---|---|---|
| Migrar meu-rhitmo de gpt-4o → gpt-4o-mini | ~90% no componente | Verificar qualidade das respostas |
| Migrar chat-mentor Layer 3 de gpt-4o → gpt-4o-mini | ~90% no componente | Verificar qualidade do RAG |
| Migrar Whisper → alternativa open-source (Groq/Deepgram) | ~50-80% no componente | Verificar qualidade pt-BR |
| Implementar cache de respostas frequentes | ~10-20% geral | Baixo risco |
| Limitar msgs Meu Rhitmo por plano | Controla teto de custo | Experiência do liderado |

---

## 6. Notas Técnicas

- **Embeddings:** O schema possui coluna `feedbacks.embedding` (pgvector) mas nenhuma Edge Function popula embeddings atualmente. Custo futuro estimado: ~$0.00002/nota via `text-embedding-3-small`.
- **Layer 2 (Compressor):** Implementado como JavaScript puro (substring/filtragem), sem chamada LLM — custo zero.
- **Lovable AI Gateway:** Todas as funções que usam o gateway (`classify-note`, `generate-review`, `generate-brief`, `analyze-job-crafting`) têm custo zero adicional pois estão inclusas no plano Lovable.
- **Resend:** Dentro do free tier (3k emails/mês), os emails transacionais não geram custo. Acima disso: ~$0.001/email.
