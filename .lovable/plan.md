## Simplificar revisão de evidências para 2 ações

Hoje a página `/evidence` tem 3 ações (Aprovar / Virar nota / Dispensar). O "Aprovar" cria um limbo confuso — fica "guardado" mas não vira nada útil. Vamos colapsar em 2 ações claras: **Virar nota** (entra no Diário de Bordo) ou **Dispensar** (some).

---

### Mudanças no app web

**1. `EvidenceCard.tsx`** — remover botão "Aprovar"
- Sobram só: `📝 Virar nota` (primário) e `✕ Dispensar` (ghost).
- "Virar nota" promovido a `variant="default"` (era secondary), pra ficar óbvio que é a ação principal.

**2. `Evidence.tsx`** — ajustar barra de seleção em lote
- Remover botão "Aprovar" da bulk action.
- Substituir por "Virar notas" (chama `convertToFeedback` em loop pra cada selecionada).
- Manter "Dispensar" e "Limpar".

**3. `EvidenceFilters.tsx`** — limpar filtro de status
- Remover opção "Aprovadas" do dropdown (status legado, deixa de ser alcançável).
- Sobra: Pendentes / Viraram notas / Dispensadas / Todas.

**4. `useEvidence.ts`** — remover mutation `approve`
- Apaga `approve` do retorno de `useEvidenceMutations`.
- Tipo `EvidenceStatus` mantém `'approved'` por compat com linhas históricas no banco, mas frontend deixa de criar novas.

---

### Mudança no Slack (shortcut "Salvar como evidência")

Hoje o shortcut grava com `status: 'approved'` (pulando a fila de revisão). Com a nova lógica, "approved" vira lixo no banco. Duas opções:

**Opção A (recomendada):** shortcut passa a criar com `status: 'pending'` — vai pra fila de revisão como qualquer outra. Mantém um único funil de decisão.

**Opção B:** shortcut converte direto em feedback (pula evidência, vai reto pro Diário de Bordo).

Vou de **Opção A** porque preserva o contexto (link do Slack, score, categoria) na página de revisão e dá ao líder a chance de revisar o texto antes de virar registro oficial. Se preferir B, me avisa.

**Arquivo:** `supabase/functions/slack-bot/index.ts` linha 1481 — trocar `status: 'approved'` por `status: 'pending'` e ajustar a confirmação ephemeral pra "✅ Evidência enviada para revisão. Ver em rhitmo.co/evidence".

---

### O que NÃO muda

- Schema do banco (coluna `status` continua aceitando `'approved'` por compat com dados antigos).
- Digest cron (já filtra só `pending`, segue funcionando).
- RLS, mapeamento de membro, classifier automático.
- Rota `/evidence`, sidebar, badge.

---

### Detalhes técnicos

- `convertToFeedback` mutation continua igual: cria `feedbacks` com `source: 'slack_ambient'` + `evidence_id`, marca evidência como `converted_to_feedback`.
- Bulk "Virar notas" roda `Promise.all` em cima de `convertToFeedback.mutateAsync` por cada evidência selecionada — toast final com contagem.
- Confirmação ephemeral do Slack ajustada pro novo fluxo (revisão obrigatória).

---

### Arquivos editados

- `src/hooks/useEvidence.ts` — remove `approve` mutation
- `src/components/evidence/EvidenceCard.tsx` — remove botão Aprovar, promove "Virar nota"
- `src/components/evidence/EvidenceFilters.tsx` — remove "Aprovadas" do select
- `src/pages/Evidence.tsx` — ajusta bulk actions
- `supabase/functions/slack-bot/index.ts` — shortcut grava `pending` + nova mensagem ephemeral

Pronto pra executar.