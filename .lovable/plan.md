## Diagnóstico

Coletamos 56 `slack_ambient_evidence`, mas **apenas 1** aparece em `context_evidence` (que alimenta o Brief executivo, a aba Evidências de `/lider/contexto` e a Rede).

Causa: o trigger `ctx_evidence_from_slack` só propaga quando `status IN ('approved','converted_to_feedback')`. Todas as 56 estão como `pending` — esperando triagem manual em `/evidence`.

Hoje o líder não tem como nem ver, nem aprovar esses sinais de dentro de `/lider/contexto`. A página parece vazia mesmo com a coleta funcionando.

Breakdown atual:
- bloqueio: 18 · entrega: 14 · reconhecimento: 20 (6 author + 11 reactions + 3 mentions) · conflito: 1 · outro: 3

## O que vamos fazer

Duas mudanças complementares — uma **automática** (pra mostrar valor já) e uma **manual** (pra o líder revisar/corrigir).

### 1. Auto-aprovar sinais de alta confiança

Subir um job/migration que marca como `approved` toda `slack_ambient_evidence` com:
- `relevance_score ≥ 0.7` **e** `category != 'outro'`, **ou**
- `attribution = 'reaction'` (≥3 reações já é sinal social forte)

Efeito imediato: o trigger existente propaga essas linhas pra `context_evidence`, e elas começam a aparecer no Brief executivo, na aba Evidências e (depois do próximo cron) na Rede. Os outros sinais (baixa relevância, "outro") ficam em `pending` pra triagem.

Backfill: rodar 1x via migration nos 56 registros atuais. Daqui pra frente o `slack-ambient-classifier` pode já gravar `status='approved'` quando bater os critérios.

### 2. Nova aba "Sinais do Slack" em `/lider/contexto`

Terceira aba ao lado de Evidências e Rede. Lista **apenas as `slack_ambient_evidence` em `pending`** do time do líder (filtro via `is_team_leader`), agrupadas por liderado.

Cada card mostra:
- categoria (chip colorido: entrega/bloqueio/reconhecimento/conflito) + score de relevância
- snippet da mensagem original + link "Ver no Slack"
- canal + "há X dias"
- chip de atribuição (author / mentioned / reaction)
- ações: **Aprovar** (status → approved, vai pro Brief), **Virar feedback** (abre dialog Magic Paste pré-preenchido), **Dispensar** (status → dismissed)

Header da aba: contador "X sinais pendentes" + botão "Aprovar todos de alta confiança" (rodada manual do auto-approve, caso o líder pause o automático no futuro).

Reuso: o componente `EvidenceCard` em `src/components/evidence/EvidenceCard.tsx` já faz quase tudo isso pra `/evidence`. Vamos extrair pra um hook compartilhado e dropar dentro da nova aba — sem duplicar lógica.

### 3. Indicador visual nas outras superfícies

- **Aba Evidências**: cards vindos do Slack (source_table = `slack_ambient_evidence`) já têm meta em `sourceMeta.ts`. Confirmar que renderizam com ícone/cor do Slack e mostram o canal no snippet.
- **MemberMasterList** (Master-Detail do Brief em outras páginas — fora de escopo agora, mas anotar): contador de sinais novos por liderado.

## Fora de escopo

- Refazer o Brief executivo (já consome `context_evidence`, vai pegar os novos sinais automaticamente).
- Mudanças no `slack-weekly-rollup` ou `detect-network-signals` (vão se beneficiar do volume aprovado naturalmente).
- Notificações Slack/email avisando "5 sinais novos pra revisar" — sprint separada.

## Detalhes técnicos

**Migration**:
```sql
-- 1) Backfill: aprovar sinais existentes que batem critério
UPDATE slack_ambient_evidence
SET status = 'approved'
WHERE status = 'pending'
  AND (
    (relevance_score >= 0.7 AND category != 'outro')
    OR attribution = 'reaction'
  );
-- Trigger ctx_evidence_from_slack já existente popula context_evidence
```

**Frontend** (`src/pages/lider/Contexto.tsx`):
- Adicionar `<TabsTrigger value="slack">` com badge de contagem pending
- Novo componente `SlackSignalsTriage.tsx` que usa hook `usePendingSlackEvidence(workspaceId)` (query direta em `slack_ambient_evidence` filtrada por status='pending' + leader scope)
- Mutations: `approveEvidence`, `dismissEvidence`, `convertToFeedback` (reusar de `useEvidence.ts`)

**Edge function** (`slack-ambient-classifier/index.ts`):
- Ao inserir, setar `status = 'approved'` quando `relevance_score >= 0.7 && category !== 'outro'` ou quando vier de reação. Caso contrário, manter `pending`.

## Critérios de validação

- Após migration: `context_evidence` cresce de ~1 pra ~40+ linhas vindas do Slack.
- `/lider/contexto` aba Evidências passa a mostrar cards do Slack.
- Brief executivo de Yasmin/Guilherme/Laís/Giovanna/Gabriela puxa pelo menos 1 win/risk vindo do Slack.
- Nova aba "Sinais do Slack" mostra os ~15 pendentes restantes (baixa confiança) pra triagem.

Posso seguir com a implementação?