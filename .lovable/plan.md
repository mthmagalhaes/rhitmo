# Pulse: página própria, separada do Contexto

## Objetivo
Tirar o Pulse de dentro de `/lider/contexto` e dar a ele uma página completa com wizard de configuração em 5 passos (estilo Windmill), lista de pulses (Drafts / Active / Closed), envio preferencial via Slack DM e reconhecimento automático da resposta independente do canal.

## Princípios
- **Líder configura** o Pulse num wizard com 5 passos.
- **Liderado responde preferencialmente via Slack** (DM do app Rhitmo). Resposta web continua disponível.
- **Reconhecimento único**: respondeu (web ou Slack) → status `completed`, evidência criada em `context_evidence` automaticamente (já existe trigger).
- Resposta no Slack pode ser conversacional (state machine que já existe) ou via modal.

## O que muda na navegação
- `/lider/pulse` deixa de ser redirect e vira a nova página.
- Banner "Pulse vive aqui dentro" e o `SendPulseButton` saem de `/lider/contexto`.
- `/liderado/pulse` passa a listar pulses pendentes/históricos do liderado (em vez de redirecionar pro dashboard).

## Página `/lider/pulse` — Lista de Pulses

Espelha o screenshot da Windmill ("Pulse Surveys"):

```text
[ Pulse Surveys ]                          [ + New Pulse ]
[ search... ]  [ filter ]
─────────────────────────────────────────────────
Draft (n)
  • Task Efficiency Insights   [Draft] [Creator]
    1 Participant · Created by you            Never Run  ⋮
Active (n)
  • ...                                       Last sent X
Closed (n)
  • ...
```

Card de cada pulse: nome, status badge, autor, participantes, último envio, taxa de resposta. Menu `⋮` com **Edit / Duplicate / Launch / Pause / Delete**.

Click na linha → tela de detalhe do pulse com 3 abas: **Launch · Participants · Settings** (ver abaixo).

## Wizard "Pulse Setup" (5 passos)

Sheet/full-screen modal abrindo do botão **+ New Pulse** (e de "Edit"). Header `Pulse Setup` à esquerda, botão fechar à direita, barra de progresso fina no rodapé, **Previous / Next** fixos no rodapé. Visual idêntico aos screenshots.

**Passo 1 — Pulse Motivation**
- Pergunta: "What do you want to learn from your team?"
- Textarea grande.
- Seção **Ideas** com chips clicáveis que pré-preenchem motivação + sugerem perguntas: `Repetitive tasks`, `All Hands feedback`, `Missing tools`, `AI usage`, `Improvement opportunities`, `Offsite feedback`, `Workplace feedback`, `Office needs`, `Pain point survey`, `Weekly blockers`, `Priorities`. (Em PT-BR.)

**Passo 2 — Discussion Guide**
- Lista ordenável de tópicos (drag handle + remover).
- Botão `+ Add Discussion Topic`.
- Pré-populado a partir do template escolhido no passo 1 (ou dos `PULSE_TEMPLATES` existentes quando aplicável).

**Passo 3 — Select Participants**
- Três opções (radio): **Everyone** (todos os liderados diretos), **Groups** (placeholder por enquanto, desabilitado se não houver grupos), **Specific People** (multi-select dos liderados do líder).

**Passo 4 — Pulse Anonymity**
- Cards lado-a-lado: **Named (Recommended)** e **Anonymous** (desabilitado se < 3 participantes, com mensagem de bloqueio).

**Passo 5 — Review Pulse**
- Card "Review Pulse Details" explicando que nada será enviado ao criar — só após "Launch".
- Campo **Name** (uso interno).
- Botão final **Create Pulse** (cria como `status='draft'`).

## Tela de detalhe do Pulse (após criar)

Tabs no topo: **Launch / Participants / Settings**.

- **Launch**: card "Want to preview first?" com `Test Pulse` (envia DM só pra mim) e `Delete`. Card grande "Launch your pulse" com `Launch Pulse` (muda status pra `active` e dispara DMs).
- **Participants**: tabela Employee / Manager / Responses / Response Rate + `Edit Participants`.
- **Settings**: edita os mesmos campos do wizard inline (motivação, guide, anonymity, name).

## Envio e resposta

**Disparo (Launch ou Test Pulse)**
- Cria 1 row em `pulse_surveys` por participante (já é o modelo atual: 1 survey = 1 member).
- O cron `slack-rhitmo-orchestrator` (já existe, roda a cada 30min) detecta os pendentes e envia DM com botões `Responder` / `Lembrar depois`. Marca `dm_sent_at` para idempotência.
- "Test Pulse" cria a survey com `requested_by = member_id_do_lider` (próprio líder) e dispara DM imediata (chamada direta ao orchestrator com flag `force=true` ou um endpoint dedicado simples).

**Resposta via Slack**
- O fluxo conversacional já existe (state machine `slack_conversations` + Lovable AI Gateway). Adapta para, ao final do diálogo, fazer `UPDATE pulse_surveys SET status='completed', responses=...`. A trigger `ctx_evidence_from_pulse_survey` já propaga pro Contexto.

**Resposta via Web**
- Liderado vê pulses pendentes em `/liderado/pulse` (nova página) e via `PendingPulseAlert` no dashboard (já existe). `AnswerPulseModal` (já existe) é o canal web.

**Reconhecimento único**
- Como ambos os caminhos terminam num `UPDATE` da mesma row pra `status='completed'`, o app reconhece automaticamente. RLS já protege ambas as direções. Realtime/`invalidateQueries` atualiza a UI do líder.

## Mudanças técnicas

**Frontend**
- `src/pages/lider/Pulse.tsx`: substituir o `<Navigate>` pela nova página de lista (3 seções: Draft/Active/Closed).
- `src/pages/lider/PulseDetail.tsx` (novo): rota `/lider/pulse/:id` com tabs Launch/Participants/Settings.
- `src/components/pulse/wizard/` (novo): `PulseWizardSheet.tsx` + 5 step components + `pulseIdeas.ts` (catálogo de ideias com motivação e perguntas pré-prontas).
- `src/components/pulse/PulseList.tsx`, `PulseRow.tsx`, `LaunchTab.tsx`, `ParticipantsTab.tsx`, `SettingsTab.tsx`.
- `src/pages/liderado/Pulse.tsx`: lista pendentes + histórico do liderado (reusa `usePendingPulseSurveys` + nova query histórica).
- `src/pages/lider/Contexto.tsx`: remover banner Pulse e `SendPulseButton`. Manter pulse como fonte do feed.
- `src/lib/pulseTemplates.ts`: estender com mapping `idea_key → { motivation, questions[] }` para o passo 1.

**Backend**
- Migration: adicionar em `pulse_surveys`:
  - `name text` (nome interno).
  - `motivation text` (passo 1).
  - `anonymity text default 'named' check (anonymity in ('named','anonymous'))`.
  - `parent_pulse_id uuid` (para agrupar 1 pulse-pai com N rows-por-membro; permite a tela "1 pulse, vários participantes").
  - status: adicionar `'active'` ao check (hoje aceita pending/completed/expired/draft? confirmar — adicionar `'draft'` e `'active'` se faltarem).
- View `pulse_groups` (security invoker) que agrega por `parent_pulse_id`: total de participantes, respostas, taxa, último envio. Simplifica a lista no front.
- Edge function `pulse-launch` (nova): valida ownership, cria as N rows filhas (uma por participante) a partir do parent draft, marca parent como `active`. Idempotente.
- Edge function `pulse-test` (nova): cria 1 row para o próprio líder e enfileira DM imediata.
- `slack-rhitmo-orchestrator`: nenhuma mudança obrigatória — já envia DM pra qualquer `pending` com `dm_sent_at IS NULL`.
- `slack-bot` / state machine: garantir que ao final do diálogo do pulse, faça o UPDATE para `completed` com `responses` formatadas. Já existe esqueleto — só ajustar para o novo formato `name + motivation + topics`.

**RLS / Triggers**
- Manter triggers atuais (`pulse_surveys_validate_workspace`, `pulse_surveys_restrict_member_update`, `ctx_evidence_from_pulse_survey`).
- RLS de INSERT já cobre líder. Adicionar política para SELECT do parent_pulse pelo líder dono.

## Itens fora de escopo (próximos sprints)
- Groups reais (passo 3 fica com placeholder desabilitado).
- Recurring schedule (mencionado na tela "Launch your pulse" mas não vamos implementar agora — botão fica só "Launch Pulse" sem recorrência).
- AI summary automático com `summary.tldr` (já previsto na memória; deixar para depois).
- Anonimato de verdade (criptografia de identidade) — UI pronta, lógica simples (apenas oculta nome no feed) fica para sprint seguinte.

## Memória a atualizar (após aprovação)
- Substituir `mem://features/pulse-surveys/fusion-with-context.md` por `pulse-dedicated-page.md` descrevendo o novo fluxo (5-step wizard, parent/child rows, Slack-first delivery).
- Atualizar `mem://features/pulse-surveys/ui-trigger-and-response.md` removendo `SendPulseButton em /lider/contexto`.
