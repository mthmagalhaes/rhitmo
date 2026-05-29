# Frequência dos Resumos Slack + RAG nos Recaps

Dois ajustes em sequência, conectados pelo mesmo objetivo: dar controle ao líder sobre quando o Diário recebe resumos do Slack e garantir que tudo que aparece no Diário entra no RAG de Mensal/Trimestral/Formal.

## 1. Frequência configurável por workspace

**Schema (`workspace_slack_settings`)** — adicionar coluna:
- `rollup_frequency text not null default 'weekly'` com check em `('off','weekly','biweekly','monthly')`.
- `last_rollup_at timestamptz` (para o cron decidir se já está na hora de rodar de novo).

**Edge function `slack-weekly-rollup`** — passa a respeitar a frequência por workspace:
- `off` → pula o workspace.
- `weekly` (default) → comportamento atual, janela 7d.
- `biweekly` → só roda se `last_rollup_at` >= 14d atrás; janela 14d.
- `monthly` → só roda se `last_rollup_at` >= 28d atrás; janela 30d.
- Atualiza `last_rollup_at` ao final de cada execução por workspace.
- `MIN_EVIDENCES` segue 3; `source_id` determinístico passa a usar `member_id + window_start` (já é o caso, só confirmar que a janela variável não gera colisão entre frequências diferentes).

**UI (`AmbientSlackSettings.tsx`)** — abaixo dos dois toggles existentes, novo bloco "Frequência do resumo no Diário":
- `Select` com 4 opções: Semanal · Quinzenal · Mensal · Desligado.
- Texto auxiliar: "Define a cadência com que a Rhitmo entrega o resumo do Slack no seu Diário de Bordo."
- Quando `Desligado`, mantém o Ambient Mode capturando sinais para o Mentor mas não gera cards no Diário (deixar claro no helper text).
- Mesma permissão atual: HR Admin ou Workspace Owner.
- Hook `useSlackChannels`/`useSlackChannelMutations`: estender `ChannelsResponse.settings` e adicionar `updateRollupFrequency` no mesmo padrão dos outros toggles.

**`slack-list-channels`** — devolver `rollup_frequency` junto das settings já retornadas.

## 2. RAG: Mensal e Trimestral consumirem `context_evidence`

`generate-formal-review` **já** lê `context_evidence` (inclui `slack_activity_rollup`, pulses, network signals, peer feedback). `generate-monthly-recap` e `generate-quarterly-recap` **não** — então o que aparece no Diário do líder não influencia o Rhitmo Mensal nem o Trimestral hoje.

**Ajuste em `generate-monthly-recap/index.ts` e `generate-quarterly-recap/index.ts`**:
- Adicionar fetch de `context_evidence` filtrado por `member_id` + janela do recap (mês/trimestre), com `deleted_at is null`, ordenado por `occurred_at desc`, limit razoável (50 mensal / 150 trimestral).
- Incluir os campos relevantes no payload do prompt como bloco "Sinais do Slack & contexto agregado" (themes, top_channels, top_collaborators, narrative, ai_assessment, highlights). Reusar `leader_edited_summary` quando presente, igual ao card do Diário.
- Reforçar no system prompt que esses são resumos agregados, não mensagens cruas (mesmo padrão do `chat-mentor`).

## Detalhes técnicos

- Migration única: `ALTER TABLE public.workspace_slack_settings ADD COLUMN rollup_frequency text NOT NULL DEFAULT 'weekly' CHECK (rollup_frequency IN ('off','weekly','biweekly','monthly')), ADD COLUMN last_rollup_at timestamptz;`
- Sem mudança em RLS/GRANTs (tabela já existente).
- Cron do `slack-weekly-rollup` continua diário 04:30 UTC — só a lógica interna de "rodar agora ou pular" muda.
- `embed-context-evidence` continua processando todos os rollups; nenhuma mudança.
- `chat-mentor` continua puxando via `match_context_evidence` (RAG) — nenhuma mudança.

## Não-escopo

- Não criar UI por liderado (frequência é por workspace).
- Não mexer no `slack-ambient-classifier` (captura continua igual, 2x/dia).
- Não alterar o card visual `SlackRollupFeedItem` no Diário.
