# Sprint 10.3 — Peer Review: Solicitação (Líder) e Resposta (Par)

Líder solicita feedback de pares para um liderado; pares convidados respondem 3 perguntas no próprio painel. INSERT em `performance_reviews` (review_type='peer', shared_with_member=false) + N rows em `review_peers`. Pares completam via UPDATE (`status='completed'`). Trigger `review_peers_restrict_peer_update` (Sprint 10.1) já garante integridade.

## Decisões de arquitetura

- **Reuso máximo dos padrões da Sprint 9.2** (Pulse): mesmo estilo de Modal, Card de alerta amber, hook `useQuery` separado, lógica de invalidação.
- **Catálogo de perguntas estático** em `src/lib/peerReviewQuestions.ts` (mesmo padrão de `pulseTemplates.ts` e `selfReviewQuestions.ts`).
- **Sem mexer em UI de leitura do líder**: nesta sprint o líder só dispara a solicitação. A consolidação/visualização das respostas dos pares fica para Sprint 10.4 (junto com Upwards review).
- **Nenhuma migration nova nesta sprint** — a infraestrutura completa (review_peers + RLS + triggers de integridade e validação de workspace) já foi entregue em 10.1.

## Restrição crítica do trigger (10.1)

`review_peers_validate_workspace` exige que `peer_user_id` seja **um auth.uid()** que pertence ao mesmo workspace via uma destas vias:
- `team_members.linked_user_id` (liderado vinculado)
- `workspaces.owner_id` ou em `hr_admin_ids`
- `teams.leader_user_id`

→ O Multi-Select de pares deve listar **usuários (auth uids)**, com label = nome do membro. Liderados sem `linked_user_id` (ainda não conectados) ficam ocultos para não causar erro de validação.

## Arquivos a criar

```text
src/lib/peerReviewQuestions.ts                                # array estático de 3 perguntas
src/components/peer-review/RequestPeerReviewModal.tsx         # modal do líder
src/components/peer-review/RequestPeerReviewButton.tsx        # trigger reutilizável
src/components/peer-review/PendingPeerReviewsAlert.tsx        # card alerta no dashboard
src/components/peer-review/AnswerPeerReviewModal.tsx          # modal do par
src/hooks/usePendingPeerReviews.ts                            # hook do par
```

## Arquivos a editar

```text
src/pages/lider/Contexto.tsx
  - Adicionar <RequestPeerReviewButton/> ao lado do <SendPulseButton/> no header.
src/components/dashboard/DirectReportDashboard.tsx
  - Logo abaixo de <PendingPulseAlert/> (linha ~486), montar <PendingPeerReviewsAlert/>.
```

## Detalhes técnicos

### `peerReviewQuestions.ts`
```ts
export interface PeerReviewQuestion { id: string; question: string; placeholder?: string }
export const PEER_REVIEW_QUESTIONS: PeerReviewQuestion[] = [
  { id: 'strengths',   question: 'O que esta pessoa faz de melhor?',
    placeholder: 'Pontos fortes que se destacam no dia a dia...' },
  { id: 'improvement', question: 'Onde ela poderia melhorar?',
    placeholder: 'Áreas de oportunidade — seja construtivo.' },
  { id: 'collab',      question: 'Como é trabalhar com ela?',
    placeholder: 'Estilo de colaboração, comunicação, ritmo...' },
];
```

### `RequestPeerReviewModal` (líder)
Estrutura idêntica ao `SendPulseModal`:
1. Query `peer-review-target-members` → liderados diretos do líder atual (mesmo padrão da query do Pulse: `team_members` join `teams.leader_user_id = userId`).
2. Query `peer-review-candidates` → todos os `team_members` do workspace **com `linked_user_id NOT NULL`**, excluindo o liderado-alvo e o próprio líder. Retorna `{ user_id: linked_user_id, name }`.
3. Multi-select de pares via toggleable badge list (sem componente shadcn novo — botões com estado).
4. Submit faz **2 passos sequenciais**:
   - **A)** `INSERT into performance_reviews` com `member_id`, `review_type='peer'`, `title='Avaliação de Pares: ${name} — ${data}'`, `shared_with_member=false`, `period_type='manual'`. `.select('id').single()` para pegar o ID.
   - **B)** `INSERT into review_peers` (array) com `review_id` + cada `peer_user_id`, `status='pending'`.
   - Em caso de falha em B, rollback manual: `DELETE from performance_reviews where id = newReview.id`.
5. Em sucesso: toast + `invalidateQueries(['pending-peer-reviews'])` + reset.

### `PendingPeerReviewsAlert` (par)
- Hook `usePendingPeerReviews()` — sem `memberId`; usa `auth.uid()`. Query:
  ```ts
  supabase
    .from('review_peers')
    .select('id, review_id, invited_at, performance_reviews:review_id(title, member_id, team_members:member_id(name))')
    .eq('peer_user_id', user.id)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });
  ```
  RLS já filtra (peer_user_id = auth.uid() OR is_team_leader …).
- Se vazio → `return null`.
- Card amber idêntico ao Pulse, com lista clicável de itens "Avaliar **{nome do membro}**".

### `AnswerPeerReviewModal` (par)
- Mesmo layout do `AnswerPulseModal`: 3 perguntas em sequência (Textarea por pergunta), todas obrigatórias.
- Submit:
  ```ts
  await supabase.from('review_peers').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    response_jsonb: {
      questions: PEER_REVIEW_QUESTIONS.map((q) => ({
        id: q.id,
        question: q.question,
        answer: answers[q.id].trim(),
      })),
      submitted_at: new Date().toISOString(),
    },
  }).eq('id', peerInvite.id);
  ```
  Trigger `review_peers_restrict_peer_update` aceita: peer pode mudar `status` para `completed` e gravar `response_jsonb`. `completed_at` é forçado pelo trigger se nulo.
- `invalidateQueries(['pending-peer-reviews'])` em sucesso.

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Liderado sem `linked_user_id` selecionado como peer → trigger erra | Filtrar `linked_user_id NOT NULL` no `select` de candidatos. |
| Falha no INSERT B (review_peers) deixa review-pai órfã | Rollback manual via `DELETE` no review-pai recém criado. |
| Líder sem liderados diretos | Modal exibe estado vazio, botão fica desabilitado (mesmo padrão do Pulse). |
| Peer review aparece "fantasma" no dashboard de líderes que também são liderados | Aceitável — o alerta é específico para "convites para avaliar colegas" e RLS garante que só apareça para o `peer_user_id` certo. |
| Confusão entre "self" e "peer" reviews na sub-seção de auto-avaliações do dashboard (Sprint 10.2) | Já filtrado: a query `my-self-reviews` exige `review_type='self'`, então peers nunca aparecem ali. |

## Fora de escopo (sprints futuras)

- UI do líder para revisar/consolidar respostas dos pares (Sprint 10.4).
- Compartilhar peer review consolidada com o liderado (UPDATE `shared_with_member=true` aciona ctx_evidence — já implementado em 10.1).
- Notificação Slack/email aos pares convidados.
- Upwards review (liderado avaliando líder) — Sprint 10.4.
- Editar/cancelar convite após enviado.
- Sumarização AI das respostas dos pares.
