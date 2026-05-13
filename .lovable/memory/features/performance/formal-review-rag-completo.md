---
name: Avaliação Formal — RAG completo
description: generate-formal-review consome feedbacks + 1:1s + context_evidence + pulses + peer + 360°; recaps confirmados viram camada de ancoragem (não única fonte)
type: feature
---

`generate-formal-review` agora monta `evidenceText` em duas camadas:

**1) Base — evidência crua filtrada por `[period_start, period_end]`:**
- `feedbacks` (anotações)
- `meeting_transcripts` (1:1s)
- `context_evidence` (Slack rollups, sinais de rede, pulses processados)
- `pulse_surveys` (status='completed', filtro `completed_at`)
- `peer_feedback_requests` (status='answered', filtro `responded_at`)
- `performance_reviews` 360° (`review_type IN ('self','peer','upwards')`, filtro `created_at`; HTML é stripado antes do prompt)

**2) Calibração — recaps confirmados:**
- `monthly_recaps` e `quarterly_recaps` confirmados, sob título "🧭 CALIBRAÇÕES JÁ CONFIRMADAS PELO LÍDER (camada de contexto, NÃO única fonte)".
- Prompt instrui a IA a triangular com a evidência crua; se houver divergência, **prevalece a evidência crua** e a divergência vai para o Bloco 4.

**Outras mudanças:**
- Regra #8 reescrita: deixa de chamar recaps de "espinha".
- Nova regra #9: citar `*(autoavaliação de DD/MM)* / *(par anônimo, DD/MM)* / *(upwards de DD/MM)*` para 360°.
- Nova regra #12 + flag `lowRawEvidence` (< 3 itens crus): adiciona aviso final em itálico recomendando confirmação cuidadosa.
- `evidence_count` salvo no DB = `totalRawEvidence`.

**Sem migration. Sem mudança de UI.** `CreateFormalReviewDialog` (botões Último mês / Último trimestre / Personalizado) e `get_review_evidence` (contagem prévia) ficam como estão.
