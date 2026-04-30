---
name: Self-Review Wizard Conversacional
description: Liderado preenche autoavaliação via chat passo-a-passo; INSERT direto em performance_reviews dispara ctx_evidence trigger (Sprint 10.2)
type: feature
---

# Sprint 10.2 — Self-Review Wizard

## Componentes
- `src/lib/selfReviewQuestions.ts` — array estático de 3 perguntas (achievements, improvements, support_needed). Padrão idêntico ao `pulseTemplates.ts` (Sprint 9.2), reutilizável por Slack/AI futuramente.
- `src/components/self-review/SelfReviewWizard.tsx` — Modal Dialog com chat conversacional (não reaproveita MentorChat para evitar acoplamento com RAG/threads). Bubbles + Textarea + Progress bar + preview Markdown antes de enviar.
- `src/components/self-review/StartSelfReviewCard.tsx` — Card com gradient bg-primary/5, integrado no DirectReportDashboard (sub-seção "Avaliações Formais").

## Fluxo de dados
1. Liderado responde 3 perguntas em sequência (Enter envia, Shift+Enter quebra linha).
2. Após última, modo `reviewMode=true` mostra preview Markdown com `<ReactMarkdown>`.
3. Click em "Gerar e enviar" → `INSERT into performance_reviews`:
   - `member_id = linkedMember.id`
   - `review_type = 'self'`
   - `author_user_id = auth.uid()`
   - `shared_with_member = true`
   - `period_type = 'manual'`
   - `content` = Markdown concatenado (`# Auto-avaliação\n## {q1}\n{r1}\n...`)
   - `title` = `Auto-avaliação de {nome} — {data}`
4. Trigger `ctx_evidence_from_review` (Sprint 10.1) propaga automaticamente para `context_evidence` com `evidence_type='private_leader'` (visível ao líder no /lider/contexto).

## Mudanças no DirectReportDashboard
- Query `shared-reviews` agora exclui `review_type='self'` via `.neq('review_type', 'self')` para não misturar autoavaliação com feedback recebido.
- Nova query `my-self-reviews` filtra `review_type='self' AND author_user_id = user.id`.
- Sub-seção "Suas auto-avaliações" lista os selfs reutilizando o mesmo Dialog de leitura (`selectedReview`) — 100% backward compatible.

## RLS
Permitido pela policy "Linked members can insert own self upwards reviews" criada na Sprint 10.1 (exige `author_user_id = auth.uid() AND review_type IN ('self','upwards')`). Trigger `performance_reviews_restrict_self_upwards_update` impede mutações em campos sensíveis após envio.

## Fora de escopo (sprints futuras)
- Sumarização AI (Sprint 10.3 — chamará `ai-router` task `summarize_text` antes do INSERT).
- Persistência de rascunho entre sessões.
- Upwards review (avaliação do liderado sobre o líder) — Sprint 10.4.
- Peer review trigger pelo líder — Sprint 10.5.
