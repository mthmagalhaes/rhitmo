## Sprint 10.4 — Upwards Review (Liderado avalia o Líder)

### Decisão crítica de arquitetura — `member_id` na review upwards

A política RLS criada na Sprint 10.1 **não** força um valor específico em `member_id` para upwards — ela só exige que `author_user_id = auth.uid()` e que o autor seja um `team_members` linkado. Já a trigger `ctx_evidence_from_review` propaga a evidência usando `member_id` como "sobre quem é a evidência".

Para **não quebrar nada** e reaproveitar o pipeline já testado da Self-Review, a recomendação é:

- **`member_id` = `linkedMember.id`** (o próprio `team_members.id` do liderado, igual à self-review).
- A diferença vital fica só em `review_type = 'upwards'`.
- Resultado prático: a evidência aparece no `/lider/contexto` do líder (que é leader do `team_member`), rotulada como "Feedback ascendente de {Liderado}". O líder enxerga porque é o leader do member_id; não enxerga "sobre si mesmo" porque ele não é um `team_members`.
- Nenhuma RLS, trigger ou query existente precisa mudar.

Alternativa (não recomendada nesta rodada): apontar `member_id` para uma linha do líder em outro time. Isso quebraria a hierarquia atual (líderes não têm `team_members` próprio garantido) e exigiria refator de RLS. Fica fora de escopo.

### O que vai ser construído

1. **`src/lib/upwardsReviewQuestions.ts`** — array com 3 perguntas estáticas:
   - O que seu líder faz que te ajuda a trabalhar melhor?
   - O que ele(a) poderia fazer diferente para te apoiar mais?
   - Como você avalia a comunicação e a clareza dos objetivos passados a você?

2. **`src/components/upwards-review/UpwardsReviewWizard.tsx`** — clone enxuto do `SelfReviewWizard`:
   - Mesmo padrão visual (Dialog + chat bubbles + Progress + preview Markdown).
   - INSERT em `performance_reviews` com:
     ```
     member_id: linkedMember.id
     review_type: 'upwards'
     author_user_id: auth.uid()
     title: 'Feedback ascendente — {nome do liderado} → {nome do líder} — {data}'
     content: Markdown concatenado
     shared_with_member: true
     period_type: 'manual'
     ```
   - `invalidateQueries(['my-upwards-reviews', memberId])` no sucesso.

3. **`src/components/upwards-review/StartUpwardsReviewCard.tsx`** — card compacto, mesmo estilo do `StartSelfReviewCard` mas com microcopy de liderança e ícone diferente (ex: `ArrowUpRight`). Mostra contagem de upwards já enviados.

4. **`useLeaderInfo` (hook leve inline ou em `src/hooks/useLeaderInfo.ts`)** — busca o `teams.leader_user_id` + nome do líder a partir do `linkedMember.id`. Se `leader_user_id` for nulo, o card não é renderizado.

5. **Edição em `src/components/dashboard/DirectReportDashboard.tsx`**:
   - Adicionar nova query `my-upwards-reviews` (filtrando `review_type='self'` na query existente já está coberto; precisamos garantir que `shared-reviews` também exclua `'upwards'` para não duplicar — verificar e ajustar com `.not('review_type', 'in', '(self,upwards)')`).
   - Adicionar nova sub-seção "Suas avaliações ao seu líder" listando os upwards (reaproveita o mesmo Dialog de leitura `selectedReview`).
   - Renderizar `<StartUpwardsReviewCard>` ao lado do `<StartSelfReviewCard>` quando houver líder vinculado.

### Garantias de não-quebra

- RLS: o INSERT cai exatamente na policy "Linked members can insert own self upwards reviews" já existente — sem mudanças no banco.
- Trigger de integridade: `member_id` permanece o mesmo do liderado, então `is_team_leader(auth.uid(), member_id)` falha (autor não é leader de si próprio), portanto a trigger de restrição se aplica e protege os campos sensíveis exatamente como na self-review.
- ctx_evidence: já trata `'upwards'` desde a Sprint 10.1 (só emite quando `shared_with_member=true`, com visibility `'shared'`).
- Listagens existentes do líder (`shared-reviews`) não exibem upwards porque a query do dashboard do líder filtra `member_id` do liderado e tipo manager/peer; vamos garantir explicitamente exclusão de `'upwards'` em qualquer query que possa misturar tipos.
- Nenhuma migração de banco.

### Fora de escopo desta sprint
- Anonimização/agregação para o líder (Sprint 10.5).
- Sumarização AI antes do envio.
- Notificação por e-mail ao líder.
