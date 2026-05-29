## Objetivo

Reduzir o ruído do Slack no Diário de Bordo e absorver /evidence como uma aba dentro de /lider/diario, mantendo o design escolhido (abas minimalistas estilo Linear/Notion).

## Mudanças

### 1. Aba "Anotações" (atual) — consolidação semanal do Slack

**Backend (migration):**
- Atualizar `slack-weekly-rollup` para garantir 1 `context_evidence(evidence_type='slack_activity_rollup')` por `(member_id, ISO week)` (idempotência já existe via SHA-256, validar).
- A query do feed do Diário já lê esses rollups. O ajuste é puramente de **agrupamento visual**: hoje 1 rollup vira 1 linha por dia; vamos garantir que só apareça **1 card por liderado por semana**, sempre no bucket da semana correspondente.
- Sem mudança de schema. Sem mudança nos crons (já roda 04:30 UTC diário, mas só persiste 1 row/semana/liderado).

**Frontend (`src/pages/lider/Diario.tsx` + `SlackRollupFeedItem.tsx`):**
- Reescrever `SlackRollupFeedItem` como card consolidado (estilo do protótipo v1):
  - Ícone Slack monocromático violet em círculo
  - Título "Semana de DD/MM — {Nome} no Slack"
  - 3 bullets temáticos extraídos do `summary` (já vem do JSON `{themes[], narrative}`)
  - Footer com chips de tema + link "Abrir no Slack" no hover
- No agrupador por bucket, dedupe: para cada liderado, manter apenas o rollup mais recente dentro do bucket.

**Filtro Slack (chip ao lado das tags):**
- `DiaryFilters.tsx`: adicionar chip "Slack" com `SlackIcon` oficial colorido (componente já existe em `src/components/icons/SlackIcon.tsx`).
- Param `?source=slack` no URL. Quando ativo, lista só `DiaryItem` com `kind === 'slack_rollup'`.

### 2. Aba "Sinais do Slack" (nova, absorve /evidence)

**Frontend:**
- Adicionar tabs no topo de `Diario.tsx` (shadcn `Tabs`, estilo underline minimalista do protótipo):
  - "Anotações" (default)
  - "Sinais do Slack" com badge de contagem de pendentes (via `useEvidence({status:'pending'})`)
- Criar componente `DiarySlackSignalsTab.tsx` que reusa `EvidenceCard` + `EvidenceFilters` + `useEvidence` + `useEvidenceMutations` (lógica idêntica a `Evidence.tsx` hoje).
- Mantém ações: Virar nota, Dispensar, Aprovar alta confiança em massa, Selecionar todas.
- Manter link "Gerenciar canais" → /slack/channels no header da aba.

**Roteamento:**
- `/evidence` permanece como redirect para `/lider/diario?tab=signals` (compat de bookmarks/DMs).
- `?tab=signals|notes` controla a aba ativa via URL param.

### 3. Detalhes visuais (do protótipo v1)

- Tabs underline (`border-b-2 border-stone-900` no ativo, `text-stone-400` nos demais)
- Badge violet `bg-violet-100 text-violet-600 rounded text-[10px] font-bold` na aba Slack
- Chip Slack no toolbar com logo multicolor 12px + texto "Slack"
- Manter design system Creme/Bento (rounded-2xl, soft shadows, tracking-tight, Lora nos títulos)

## Out of scope

- Mudar cron do classifier ou rollup
- Mexer no chat-mentor (já consome `context_evidence` via RAG)
- Mudar página /lider/contexto
- Esconder ou desabilitar a página /evidence (vira redirect)

## Verificação

- `/lider/diario` mostra aba Anotações default com 1 card semanal/liderado de Slack misturado às notas
- Filtro chip "Slack" isola só os cards semanais
- Aba "Sinais do Slack" replica /evidence com mesmas ações
- `/evidence` redireciona para `?tab=signals`
- Build limpo, sem erro TS