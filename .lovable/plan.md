

## Relatório de Custos Operacionais — Rhitmo

Baseado na leitura completa de todas as Edge Functions, mapeei cada gatilho de custo. A seguir o plano para criar o arquivo `cost-analysis.md` na raiz do projeto.

### Arquivo a criar: `cost-analysis.md`

Conteúdo completo baseado na auditoria do código:

---

**Descobertas-chave da auditoria:**

| Operação | Modelo | Provider | Tokens est. (in/out) | Custo unitário |
|---|---|---|---|---|
| **chat-mentor Layer 1** (Router) | gpt-4o-mini | OpenAI | ~300 / ~5 | $0.000048 |
| **chat-mentor Layer 3** (Resposta) | gpt-4o | OpenAI | ~7,250 / ~800 | $0.0261 |
| **chat-mentor TOTAL** | — | — | — | **$0.0262/msg** |
| **meu-rhitmo** | gpt-4o | OpenAI | ~3,600 / ~800 | **$0.0170/msg** |
| **analyze-feedback-background** | gpt-4o-mini | OpenAI | ~3,000 / ~300 | **$0.00063/nota** |
| **classify-note** | gemini-2.5-flash | Lovable AI | ~2,500 / ~100 | **$0 (incluso)** |
| **generate-review** | gemini-2.5-flash | Lovable AI | ~8,000 / ~2,000 | **$0 (incluso)** |
| **generate-brief** | gemini-3-flash-preview | Lovable AI | ~2,000 / ~500 | **$0 (incluso)** |
| **analyze-job-crafting** | gemini-3-flash-preview | Lovable AI | ~1,500 / ~300 | **$0 (incluso)** |
| **transcribe-audio** (Whisper) | whisper-1 | OpenAI | N/A | **$0.006/min** |
| **Resend** (emails) | — | Resend | N/A | **$0 (free tier 3k/mês)** |

**Nota importante:** Layer 2 do chat-mentor (Compressor) é puro JavaScript — não faz chamada LLM. Embeddings (pgvector) existem no schema mas **nenhuma Edge Function gera embeddings atualmente** — o campo `feedbacks.embedding` não é populado pelo código atual.

**Cenários por líder/mês:**

| Componente | Leve | Moderado | Intenso |
|---|---|---|---|
| Mentor Chat (OpenAI) | $0.39 (15 msgs) | $1.57 (60 msgs) | $3.93 (150 msgs) |
| Meu Rhitmo (OpenAI) | $0.00 (0 msgs) | $0.85 (50 msgs) | $5.10 (300 msgs) |
| Análise de notas (OpenAI) | $0.013 (20 notas) | $0.025 (40 notas) | $0.050 (80 notas) |
| Whisper transcrição | $0.00 (0 min) | $0.72 (120 min) | $3.24 (540 min) |
| Lovable AI (classify, review, brief, job-crafting) | $0.00 | $0.00 | $0.00 |
| Supabase (Lovable Cloud) | incluso | incluso | incluso |
| Resend (emails) | $0.00 | $0.00 | $0.00 |
| **TOTAL USD/líder/mês** | **$0.40** | **$3.16** | **$12.32** |
| **TOTAL BRL (R$5,80)** | **R$2,34** | **R$18,33** | **R$71,46** |
| **Com margem 2x** | **R$4,68** | **R$36,66** | **R$142,92** |

**Break-even por plano (margem 2x, cenário moderado):**
- Preço mínimo para cobrir custos: **R$36,66/líder/mês**
- Com margem de lucro saudável (3x): **R$55/líder/mês**

### Detalhes técnicos do cálculo

Preços OpenAI utilizados (Março 2026):
- gpt-4o: $2.50/1M input, $10.00/1M output
- gpt-4o-mini: $0.15/1M input, $0.60/1M output
- whisper-1: $0.006/minuto

O maior driver de custo é **Whisper** no cenário intenso e **Meu Rhitmo** (gpt-4o com 300 mensagens de liderados). O Mentor Chat do líder é o segundo maior custo.

### Implementação

Criar um único arquivo `cost-analysis.md` na raiz do projeto com todas as tabelas, premissas e cálculos detalhados.

