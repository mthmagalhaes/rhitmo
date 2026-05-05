## Diagnóstico do "Não conseguimos carregar o feed agora"

Os logs do Postgres mostram o erro real:

```
column tm.workspace_id does not exist
```

A função `get_team_timeline` faz `JOIN team_members tm` e referencia `tm.workspace_id`, mas a tabela `team_members` **não tem** coluna `workspace_id` — o workspace é resolvido via `teams.workspace_id` (já há `LEFT JOIN teams t`). Por isso o feed quebra para todo mundo. Existem 23 linhas em `context_evidence`, então não é falta de dado.

## Mudanças propostas

### 1. Migração: corrigir `get_team_timeline`

Recriar o RPC trocando `tm.workspace_id` por `t.workspace_id` (e o filtro de workspace passa a usar a coluna do `teams`). Também garantir que o `LEFT JOIN workspaces w` use `w.id = t.workspace_id`. Mantém SECURITY DEFINER, mesma assinatura, mesmo retorno.

Trecho corrigido:
```sql
LEFT JOIN public.teams t ON t.id = tm.team_id
LEFT JOIN public.workspaces w ON w.id = t.workspace_id
WHERE
  (_workspace_id IS NULL OR t.workspace_id = _workspace_id)
  AND ( v_is_admin OR t.leader_user_id = v_uid OR ... )
```

### 2. Remover Peer Review do alcance do Líder

Peer Review (avaliação de pares) passa a ser função exclusiva de HR Admin no futuro. Por enquanto, esconder do líder:

- **`src/pages/lider/Contexto.tsx`**: remover import e render de `<RequestPeerReviewButton />` da sticky bar de filtros.
- **`src/components/dashboard/DirectReportDashboard.tsx`**: remover qualquer entrypoint de peer review visível ao líder (verificar se é `PendingPeerReviewAlert` ou similar — só remover o que aparece no contexto do líder; o do liderado respondendo permanece, pois é o lado "par convidado").
- **Manter intactos** (não deletar arquivos): `RequestPeerReviewButton.tsx`, `RequestPeerReviewModal.tsx`, `AnswerPeerReviewModal.tsx`, `usePendingPeerReviews.ts`, hook e tabela `review_peers`. Vão ser reaproveitados quando a feature for movida para HR Admin.
- **Não mexer** em RLS nem em `performance_reviews`/`review_peers` no banco.

### 3. Memória

Atualizar `mem://features/performance/peer-review-ui` registrando que peer review está temporariamente oculto do líder e será movido para HR Admin.

## O que NÃO muda

- Triggers de `ctx_evidence` (incluindo o de `review_peers`) continuam alimentando o Contexto normalmente — se um peer review acontecer por outra via, ainda vira evidência.
- Hook `useTeamTimeline` e UI do `/lider/contexto` (filtros, banner, EvidenceCard) ficam como estão.
- Botão `SendPulseButton` continua na sticky bar.

## Resultado esperado

- `/lider/contexto` volta a carregar o feed (23+ evidências aparecem).
- Sticky bar do Contexto mostra apenas "Enviar Pulse" no canto direito.
- Líder não vê nem dispara solicitações de peer review em lugar nenhum da UI.
