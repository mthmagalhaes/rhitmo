
## Diagnóstico (causa raiz encontrada)

A reunião do Matheus (27/04, 14:30, link `meet.google.com/bhc-mqxi-imr`, duração 1h12) foi gravada e transcrita com sucesso pelo Recall — **a transcrição ainda está disponível na API do Recall agora**. O problema foi do nosso webhook, não do Recall.

### O que aconteceu, passo a passo

1. Matheus clicou "Transcrever" no card da Gabriela Lucas no dashboard. `schedule-recall-bot` criou o registro com `trigger_source = 'manual'`, `member_id = Gabriela`, `leader_email = matheus.magalhaes@fstr.co`.
2. Bot entrou na call, gravou 1h12, gerou transcrição completa (status `done` no Recall, `download_url` válido).
3. Webhook `bot.done` chegou. Como `leader_email` está setado e `leader_detected = false`, entrou no bloco da linha 97 do `recall-webhook/index.ts`, que chama `checkLeaderPresence`.
4. `checkLeaderPresence` consulta `GET /api/v1/bot/{id}/` e lê `meeting_participants` (linha 164). O Recall retornou **`meeting_participants: []`** nesse endpoint.
5. Como `leaderFound = false`, marcou `status = 'skipped_no_leader'` + `error_message = "Líder não detectado na reunião — bot removido automaticamente"` (linha 198) e **descartou a transcrição**.
6. Resultado: nada salvo para Gabriela nem para nenhum outro liderado. Última nota da Gabriela continua sendo a de 24/04.

### Por que `meeting_participants` veio vazio

A lista real de participantes existe — confirmei baixando `recordings[0].media_shortcuts.participant_events.data.participants_download_url`, que retorna os 6 participantes reais: Matheus Magalhaes (host), Yasmin Nobrega, Giovanna Barletta, Laís Isfer, Guilherme Cunha, Gabriela Lucas. Eles têm `email: null` (Google Meet não expõe email do participante por padrão), só nomes.

O `meeting_participants` no objeto raiz do bot é uma view legacy/agregada do Recall que vem **vazia em alguns formatos de Google Meet** (provavelmente porque ninguém entrou via convite calendar com email vinculado). A fonte correta é `media_shortcuts.participant_events`.

Além disso, a `checkLeaderPresence` tenta casar **só por email** ou por nome contendo o prefixo do email (`matheus.magalhaes`). Mesmo se a lista viesse populada, o nome no Google Meet é "Matheus Magalhaes" (sem ponto), então o match `name.includes('matheus.magalhaes')` falharia.

### Por que a memória dizia que `manual` não tinha auto-leave (e dizia errado)

A memória `mem://features/recall-ai/bot-transcription-architecture` afirma que bots `manual` **não aplicam auto-leave por presença, validam só no bot.done**. O código faz exatamente isso: pula a checagem em `in_call_recording` (linha 91-93). Mas no `bot.done` (linha 97), **a checagem roda para os dois trigger_sources**, e como ela usa o `meeting_participants` vazio do Recall, qualquer bot manual cuja call não tenha emails expostos é descartado. **Isso é um bug — o contrato prometido pela arquitetura está quebrado.**

---

## Plano de correção

### 1. Corrigir o bug do `checkLeaderPresence` (recall-webhook/index.ts)

Três mudanças complementares:

**a) Ler participantes da fonte correta.** Em vez de usar só `botData.meeting_participants` (frequentemente vazio em Meet), também baixar `recordings[0].media_shortcuts.participant_events.data.participants_download_url` e mesclar os participantes únicos por nome.

**b) Casar por nome de líder, não só prefixo de email.** Buscar o `display_name` do líder em `auth.users.user_metadata.full_name` e em `team_members` (alguns líderes também aparecem como liderados) e fazer match case-insensitive normalizado. Manter o casamento por email/prefixo como fallback.

**c) Para `trigger_source = 'manual'`, NUNCA descartar a transcrição.** Confiar no clique explícito do líder. Se não conseguir confirmar presença, marcar `leader_detected = false` mas processar a transcrição normalmente (criar `meeting_transcripts` e `feedbacks`). Bots `auto_calendar` mantêm o comportamento atual (descartar para não cobrar minutos por reuniões em que o líder não foi).

```text
trigger_source = 'manual'  → SEMPRE processa transcrição. leader_detected é informativo.
trigger_source = 'auto_calendar' → Descarta se líder ausente (comportamento atual).
```

### 2. Replicar a transcrição perdida do Matheus para os 5 liderados

A transcrição ainda está disponível na Recall API. Vou criar uma Edge Function pontual `reprocess-recall-bot` (one-shot, invocada manualmente via curl) que:

- Recebe `recall_bot_id`.
- Baixa a transcrição via `media_shortcuts.transcript.data.download_url`.
- Aplica a nova lógica de matching de membros (via `participant_events` + nomes).
- Cria `meeting_transcripts` + `feedbacks` para os 5 membros que estavam na call (Yasmin, Giovanna, Laís, Guilherme, Gabriela), todos com `manager_id = matheus`.
- Atualiza o `recall_bots.0bb0c084...` para `status = 'done'`, `leader_detected = true`, limpa `error_message`.
- Dispara `analyze-feedback-background` para cada feedback.

Após criada, eu mesmo invoco a função uma vez com o ID do bot do Matheus para recuperar a transcrição perdida.

### 3. Endurecer a UX do erro

No estado atual, quando um bot vira `skipped_no_leader`, o líder não recebe **nenhuma notificação**. Para evitar que o problema se repita silenciosamente:

- Quando um bot `manual` for marcado como `skipped_no_leader` (cenário que não vai mais acontecer após o fix, mas defesa em profundidade), enviar uma notificação no `notifications` apontando o problema com link para recuperar.
- Adicionar um log estruturado (`console.warn`) com `bot_id`, `meeting_url`, `participants_count` sempre que `participants` vier vazio do `meeting_participants` raiz mas não-vazio em `participant_events` — para detectar regressões.

### 4. Atualizar a memória de arquitetura

Atualizar `mem://features/recall-ai/bot-transcription-architecture` para refletir:
- Bots `manual` **nunca** descartam transcrição (mesmo no `bot.done`), apenas marcam `leader_detected` como informativo.
- A fonte correta de participantes do Google Meet é `media_shortcuts.participant_events`, não `meeting_participants` raiz.

---

## Detalhes técnicos

### Arquivos a editar

- `supabase/functions/recall-webhook/index.ts` — refatorar `checkLeaderPresence` (novo nome interno: `resolveMeetingParticipantsAndLeader`); ajustar bloco do `bot.done` (linhas 97-112) para respeitar `trigger_source`.
- `supabase/functions/_shared/recallParticipants.ts` (novo) — helper para baixar participants_download_url e normalizar nomes.

### Arquivos a criar

- `supabase/functions/reprocess-recall-bot/index.ts` — função one-shot, autenticada com service role, recebe `{ recall_bot_id }`.

### Mudanças de schema

Nenhuma. Os campos `leader_detected`, `trigger_source` e `error_message` já existem.

### Migrations

Nenhuma.

### Validação pós-deploy

1. Invocar `reprocess-recall-bot` com `bot_id = 0bb0c084-86ef-4239-8d6c-25a3db0d9ab6`.
2. Confirmar 5 novas linhas em `meeting_transcripts` (uma por liderado), 5 novas em `feedbacks` com `source = 'recall_bot'`, todas com `manager_id = matheus`.
3. Confirmar visualmente no painel da Gabriela (Diário de Bordo) que a transcrição apareceu com data 27/04.
4. Confirmar nos painéis de Yasmin, Giovanna, Laís e Guilherme.

### O que NÃO vou mudar

- Política de `auto_calendar` (continua descartando se líder ausente — protege custo de Recall).
- Cron `check-pending-leader-presence` (continua para `auto_calendar`; bots `manual` nunca entram nele porque a query filtra por `trigger_source = 'auto_calendar'`).
- Limite de chars (`truncatedContent.slice(0, 15000)`) — fora de escopo.
