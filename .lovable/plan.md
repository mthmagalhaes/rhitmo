# Sprint 10.1 — Fundação 360° (Self / Peer / Manager / Upwards)

> **Nota de nomenclatura.** A tabela em produção chama-se `performance_reviews` (não `formal_reviews`). Vou tratá-la como a "tabela de reviews formais" do pedido — não vou renomeá-la para evitar quebrar absolutamente tudo (RLS, triggers `ctx_evidence`, edge functions `generate-formal-review`, hooks, componentes, types.ts).

## Estado atual relevante

- `performance_reviews` **não tem coluna de autor** (`manager_id`/`author_user_id`). Hoje o autor é implícito: o líder do time do `member_id`. Insert/Update só passam pelas políticas se o usuário for líder do time ou workspace owner.
- Linked member só faz `SELECT` quando `shared_with_member = true`. **Nunca insere/atualiza.**
- Trigger `ctx_evidence_from_review` propaga reviews compartilhadas para `context_evidence` baseando-se em `shared_with_member` + `period_type`.

Isto significa que para suportar Self/Upwards (preenchidos pelo liderado) e Peer (preenchidos por colega), precisamos introduzir **autor explícito** + adaptar RLS, sem quebrar o caminho `'manager'` atual.

## Decisões de arquitetura

1. **Adicionar `review_type` com default `'manager'`** (CHECK constraint, não enum nativo — segue o padrão `classification_check` já usado nessa tabela e evita migração de tipo). Backfill automático via DEFAULT cobre todos os registros existentes.

2. **Adicionar `author_user_id uuid`** (nullable, para retrocompat). Necessário porque:
   - Em `self` o autor é o `linked_user_id` do membro.
   - Em `upwards` o autor é o membro avaliando o líder.
   - Em `peer` o "review pai" continua sendo do líder, mas as **respostas individuais ficam em `review_peers`** (autor por linha).
   - Em `manager` continua null/líder — resolvido implicitamente como hoje.

3. **Nova tabela `review_peers`** com FK para `performance_reviews(id) ON DELETE CASCADE`. Cada par convidado vira uma linha. RLS permite o líder ler tudo, e o `peer_user_id` ler/atualizar **apenas** sua própria linha (somente `response_jsonb`, `status`, `completed_at`).

4. **RLS de `performance_reviews` estendida — sem remover nada existente:**
   - Adicionar policies SELECT/INSERT/UPDATE para o **linked member** quando `review_type IN ('self','upwards')` E `author_user_id = auth.uid()` (member preenche o próprio self/upwards).
   - Manter intactas todas as policies atuais ("Owners podem...", "Linked members can view shared reviews", "Admin Full Access", workspace owner SELECT).

5. **Trigger `ctx_evidence_from_review` — alteração mínima:**
   - Continuar disparando para `manager` reviews compartilhadas (comportamento atual preservado).
   - Adicionar `self` (sempre visível ao líder do membro como evidência `private_leader`) e `peer`/`upwards` quando `shared_with_member = true`. Tag inclui `review_type` para filtragem no `/contexto`.
   - **Não** quebra o trigger atual: muda apenas a CTE/condição com fallback para o tipo `'manager'` quando `review_type` é null (registros legados).

6. **Frontend retrocompatível.** Como `review_type` tem `DEFAULT 'manager'` e `author_user_id` é nullable, **nenhum INSERT existente quebra**. Os hooks/componentes (`PerformanceReviewList`, `NewReviewDialog`, `CreateFormalReviewDialog`, `FormalReviewSheet`, `ReviewViewDialog`, `useLeaderInbox`) continuam funcionando sem mudança nesta sprint. UI 360° vem na Sprint 10.2.

## Esquema SQL (resumo)

```text
ALTER TABLE performance_reviews
  ADD COLUMN review_type text NOT NULL DEFAULT 'manager',
  ADD COLUMN author_user_id uuid,
  ADD CONSTRAINT performance_reviews_review_type_check
    CHECK (review_type IN ('manager','self','peer','upwards'));

CREATE INDEX idx_perf_reviews_member_type ON performance_reviews(member_id, review_type);
CREATE INDEX idx_perf_reviews_author ON performance_reviews(author_user_id) WHERE author_user_id IS NOT NULL;

CREATE TABLE review_peers (
  id uuid PK default gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  peer_user_id uuid NOT NULL,           -- auth.users.id (sem FK direta — padrão do projeto)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','declined','expired')),
  response_jsonb jsonb NOT NULL DEFAULT '{}',
  invited_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, peer_user_id)
);

CREATE INDEX idx_review_peers_review ON review_peers(review_id);
CREATE INDEX idx_review_peers_peer ON review_peers(peer_user_id);
```

## RLS planejada

**`performance_reviews` (apenas adições, sem DROPs):**
- `"Linked members can write own self/upwards"` (INSERT): `author_user_id = auth.uid() AND review_type IN ('self','upwards') AND EXISTS(SELECT 1 FROM team_members WHERE id = member_id AND linked_user_id = auth.uid())` — para `'self'`. Para `'upwards'` o `member_id` referencia o **líder sendo avaliado** (nota: validamos via trigger BEFORE INSERT que `member_id` representa um team_member válido no mesmo workspace do autor).
- `"Linked members can update own self/upwards"` (UPDATE): mesma condição, restringe colunas via trigger BEFORE UPDATE (similar ao padrão `pulse_surveys_restrict_member_update` da Sprint 9.1) — só permite mudar `content`, `competency_evaluations`, `shared_with_member`, `sent_at`.
- `"Linked members can view own self/upwards"` (SELECT): `author_user_id = auth.uid()`.

**`review_peers` (nova):**
- SELECT: `peer_user_id = auth.uid()` OR líder do membro avaliado (via join `performance_reviews → team_members → teams.leader_user_id`) OR workspace owner OR `is_admin()`.
- INSERT: somente líder do membro avaliado (insere convites).
- UPDATE: 
  - Líder pode atualizar `status` (cancel/expirar) e qualquer campo administrativo.
  - Peer pode atualizar **apenas** `response_jsonb`, `status` (somente `pending → completed`), `completed_at` — garantido por trigger BEFORE UPDATE (`review_peers_restrict_peer_update`).
- DELETE: somente líder ou workspace owner.

## Triggers de integridade (padrão da Sprint 9.1)

1. `review_peers_restrict_peer_update` — espelha `pulse_surveys_restrict_member_update`: se `auth.uid() = peer_user_id` (e não é líder/owner), só pode mexer em `response_jsonb / status / completed_at`; status restrito a `pending → completed`.
2. `performance_reviews_restrict_self_upwards_update` — se `auth.uid() = author_user_id` E `review_type IN ('self','upwards')`, bloqueia mudanças em `member_id`, `review_type`, `author_user_id`, `classification`, `loss_risk`, `merit_recommendation`, `promotion_recommendation` (campos de calibração do líder).
3. `set_updated_at` em `review_peers` (trigger genérico já existente no projeto).

## ctx_evidence — extensão segura

Atualizar `ctx_evidence_from_review`:
- Caso `review_type = 'manager'` (ou null): comportamento atual.
- Caso `review_type = 'self'`: cria evidência com `visibility = 'private_leader'`, tag `['review','self']` — sempre que existir conteúdo.
- Caso `review_type IN ('peer','upwards')`: cria evidência apenas se `shared_with_member = true` (peer agregado fica visível no Context Graph).

## Fora de escopo

- UI/Frontend (formulários self/peer/upwards, dashboard 360°) — Sprint 10.2.
- Função AI para gerar perguntas de peer review — Sprint 10.3.
- Notificação por email/Slack ao convidar pares — depois.
- Agregação de respostas peer em sumário no review pai — Sprint 10.3.

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Quebrar generate-formal-review (edge function) | `review_type` tem default `'manager'`; nada muda no payload atual. |
| Frontend espera `manager_id` ou colunas novas | Não introduzimos `manager_id`; `author_user_id` é nullable e ignorado pelos componentes atuais. |
| Liderado tentar abrir review como outro user | INSERT policy força `author_user_id = auth.uid()`; trigger valida workspace match. |
| Ctx evidence duplicada para reviews legados | Trigger usa `ON CONFLICT (source_table, source_id)` já existente — UPSERT idempotente. |
| Constraint quebrar registros existentes | `DEFAULT 'manager'` aplicado ao `ADD COLUMN`, todos os legados ficam válidos. |

## Arquivo único de migração

`supabase/migrations/<timestamp>_sprint_10_1_360_reviews_foundation.sql` contendo as 6 partes acima em ordem (ALTER → CREATE TABLE → INDEXES → RLS → triggers → ctx_evidence update). Tudo idempotente (`IF NOT EXISTS` / `DROP POLICY IF EXISTS` antes do CREATE).
