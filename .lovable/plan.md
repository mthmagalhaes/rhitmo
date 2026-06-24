# Camada de Ambiente: o Coach que "sente a sala"

## Resposta direta à pergunta

**Sim, é possível — e é exatamente onde o Recall.ai vira vantagem injusta da Rhitmo.**

Pesquisa rápida do mercado:


| Ferramenta                 | Tem camada de ambiente?                                                                                                                                                                      | Faz drift longitudinal por pessoa?                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Granola**                | ❌ Só transcrição + summary. API expõe `transcript`, `summary`, `attendees`. Nada de sentimento, talk-time, energia.                                                                          | ❌ Zero                                                |
| **Otter**                  | ❌ Talk-time básico, nada subjetivo                                                                                                                                                           | ❌                                                     |
| **Fireflies**              | ✅ Talk-time, silêncio, monólogos, filler words, WPM, perguntas, sentimento (tudo derivado do transcript)                                                                                     | ⚠️ Agregação por período, não por dyad líder↔liderado |
| **Gong / Chorus**          | ✅✅ Talk-ratio, paciência, monólogos, sentimento, trackers de tópico, scorecards por rep ao longo do tempo. Padrão-ouro — mas focado em vendas                                                | ✅ Por rep, não por relação líder↔liderado             |
| **Read.ai**                | ✅✅✅ Único multimodal: análise facial + prosódia (pitch, volume) + NLP. Read Score = sentimento + engajamento por pessoa em tempo real                                                        | ⚠️ Histórico pessoal sim, dyad recorrente não         |
| **Recall.ai** (nossa base) | ❌ "Cru" por design — mas expõe `audio_separate_raw` (PCM por pessoa), `video_separate_png` (frames faciais 2fps por pessoa), `participant_events` (speech_on/off, webcam_on/off, join/leave) | —                                                     |


**Insight central da pesquisa:** o Recall já entrega mais sinal bruto do que o Read.ai precisa internamente. O que falta é a camada de modelos + persistência longitudinal por dyad. **Nenhum produto do mercado faz drift por relação líder↔liderado recorrente** — esse é o whitespace da Rhitmo.

Evidência acadêmica (MDPI 2024, Frontiers 2025, arXiv 2025): **a variação do baseline pessoal prediz bem-estar/burnout/desengajamento muito melhor que valores absolutos**. Pessoa naturalmente quieta com talk-time baixo é normal; a mesma pessoa caindo 3σ abaixo do próprio baseline em 6 semanas é sinal real.

---

## Proposta em 3 fases

### Fase 1 — "Sinais da reunião" (transcript + eventos, baixo custo)

Sem áudio/vídeo extra, só explorar o que o Recall já manda no webhook `bot.done`:

Por participante, por reunião:

- **Talk-time** (segundos e %)
- **Razão de fala líder↔liderado** (50/50? 80/20?)
- **Silêncios longos** (gaps >3s)
- **Interrupções** (overlap de fala)
- **Câmera ligada** (% da reunião)
- **Atraso** (join vs. start do calendário)
- **Perguntas feitas** (NLP simples no transcript)
- **Tamanho médio da resposta** (palavras/turno)
- **Sentimento da sessão por pessoa** (LLM no transcript — Gemini 2.5 Flash, ~$0.002/reunião)

Output: nova tabela `meeting_signals` com 1 linha por (reunião × participante), ~15 colunas numéricas.

### Fase 2 — "Memória do dyad" (drift longitudinal — o diferencial real)

- Detector de série recorrente: mesmas 2 pessoas, cadência semanal → `meeting_series_id`
- Baseline pessoal rolante (4 semanas) por participante × série
- Alerta de drift: ≥3 sinais divergindo do baseline na mesma direção → flag no Brief da próxima 1:1
- Card no `/lider/[liderado]`: "Nas últimas 6 sessões com Isaac: talk-time ↓22%, perguntas ↓40%, silêncio ↑15%. Padrão consistente com início de desengajamento."
- Alimenta o **Brief pré-1:1** e a **Matriz de Análise Integrada** (Watermelon detection ganha lastro factual, não só interpretativo)

### Fase 3 — "Camada multimodal" (opcional, alto valor, custo médio)

- `audio_separate_raw` → librosa/openSMILE → energia (RMS), pitch (F0), taxa de fala, pausas
- `video_separate_png` (2fps já cortado por pessoa) → MediaPipe Face Mesh → contato visual, sorrisos, acenos
- LGPD/GDPR: opt-in explícito, desligável no workspace, frames descartados pós-processamento
- Trava EU: Read.ai desliga facial na Europa por GDPR — replicamos a regra

---

## Recomendação

Começar **Fase 1 + Fase 2** juntas. Fase 1 sozinha vira "mais um Fireflies"; Fase 2 é o que ninguém faz e conecta com tudo que a Rhitmo já tem (Brief, Mentor Chat, Watermelon, Pulse). Fase 3 fica para depois — vale validar com 5–10 líderes se os sinais Tier 1 já produzem insights acionáveis antes de investir em prosódia/visão.

## Próximo passo

Preciso de uma decisão antes de detalhar o plano técnico:

1. **Escopo**: começar Fase 1+2 juntas, ou só Fase 1 primeiro pra validar com usuários reais? Fase 1+2
2. **Onde aparece**: novo card no `/lider/[liderado]`, dentro do Brief de 1:1, ou ambos? Acho que ninguém nem acessa o brieg, precisava ser em `/lider/[liderado de um jeito amigável.` 
3. **Quem vê**: só o líder, ou o liderado também enxerga os próprios sinais (transparência radical estilo "Mirror")? Só o lider.