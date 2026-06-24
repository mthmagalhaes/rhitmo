## Diagnóstico

### Bug 1 — "❌ Apenas líderes podem gerar pautas"

Em `supabase/functions/slack-bot/index.ts:765` a função `getUserPersona()` resolve o papel assim, **nessa ordem**:

1. `workspace.owner_id === user_id` → `leader`
2. `workspace.hr_admin_ids` contém o user → `hr_admin`
3. existe linha em `team_members` com `linked_user_id = user_id` → **`direct_report`** (sai aqui)
4. fallback → `leader`

O `prep_1on1_brief` (linha 2032) bloqueia qualquer persona ≠ `'leader'`. Resultado: **todo líder que também é liderado de alguém** (caso clássico do Matheus, e de qualquer líder dentro de uma hierarquia) é classificado como `direct_report` e nunca consegue gerar pauta — mesmo sendo o dono da reunião.

A autorização correta para "Gerar Pauta" não é "é líder no workspace", é "é o dono daquela `upcoming_meeting`". O `briefGenerator.ts:113` já valida `meeting.user_id !== expectedUserId` — a checagem de persona no Slack é redundante e quebra o fluxo.

### Bug 2 — Pauta/Brief pobre em contexto longitudinal

`briefGenerator.ts` hoje injeta no prompt:
- 10 action items pendentes (de `feedbacks`)
- últimas **5 notas** (de `feedbacks`, qualquer tipo, content truncado em 300 char)
- rede ONA + sinais + 2 vozes de pares
- rollup Slack 7d

**Não puxa nada das últimas 1:1s de fato**: nem `meeting_transcripts` (transcript/resumo do que foi conversado), nem `monthly_recaps`/`quarterly_recaps` confirmados (a "memória" oficial do liderado), nem o último `brief_cache` consumido (o que foi proposto da última vez e ficou em aberto). Por isso a pauta sente-se "genérica" reunião após reunião.

---

## Plano

### 1. Corrigir autorização do botão "Gerar Pauta" (Slack)

Em `supabase/functions/slack-bot/index.ts` (case `prep_1on1_brief`, ~linha 2028):

- Remover o gate `persona !== 'leader'`.
- Exigir apenas `briefPersona.userId` (usuário autenticado via slack_integrations).
- Confiar na checagem real de ownership que já existe em `briefGenerator.ts:113` (`meeting.user_id !== expectedUserId` → throw `Forbidden`).
- Capturar especificamente o `Forbidden` e devolver mensagem clara: "Essa reunião não está vinculada à sua conta Rhitmo."
- Mesma correção no caminho de fallback (busca em `upcoming_meetings` já filtra por `user_id`, ok).

Opcional (defesa em profundidade): também relaxar o mesmo gate em `prep_1on1_brief` da DM proativa (`slack-rhitmo-orchestrator`) se aplicável — verificar e alinhar.

### 2. Enriquecer o Brief com memória longitudinal real

Adicionar ao `briefGenerator.ts`, antes da chamada AI, três novos blocos de contexto (todos com try/catch + fallback silencioso, padrão atual do arquivo):

**a) Últimas 1:1s factuais (`meeting_transcripts`)**
- Buscar últimos 3 transcripts da dupla líder↔liderado (filtrar por `member_id` e janela 90d).
- Usar `summary` quando existir; senão, primeiros 600 char do transcript.
- Injetar como bloco `Últimas 1:1s registradas:` no prompt.

**b) Memória oficial (`monthly_recaps` + `quarterly_recaps` confirmados)**
- Último `quarterly_recaps` `status='confirmed'` do `member_id` → highlights + recurring_patterns + classification + turnover_risk.
- Últimos 2 `monthly_recaps` `status='confirmed'` → highlight_text + concern_text + dominant_pattern.
- Injetar como bloco `Memória confirmada do liderado (já validada por você):`.
- Isso ancora a IA na narrativa oficial, evitando reinvenção a cada brief (alinha com `mem://features/performance/formal-review-rag-completo`).

**c) Brief anterior + o que ficou aberto**
- Se `meeting.brief_cache` anterior existe (mesmo expirado para o cache de 30min), extrair `suggested_agenda` + `pending_items` da última geração.
- Injetar como `Da última pauta sugerida, ainda em aberto:` para a IA marcar continuidade ("retomar X que ficou de você fechar com Maria") em vez de propor tópicos do zero.

### 3. Ajuste no prompt

Reforçar no `userPrompt` de `generateBriefForMeeting`:
- "Conecte os tópicos da agenda com padrões já observados nas últimas 1:1s e na memória confirmada — cite a data quando ajudar."
- "Se um tópico está aparecendo pela 3ª reunião seguida sem resolução, sinalize explicitamente no `coaching_reminder`."
- Manter limite: máx. 3 itens de agenda, máx. 5 pendências, baseado APENAS no contexto fornecido.

### 4. Telemetria mínima

Adicionar log estruturado em `briefGenerator.ts` com contagens: `{ feedbacks_used, transcripts_used, monthly_recaps_used, quarterly_recap_used: bool, previous_brief_used: bool }`. Ajuda a diagnosticar "por que a pauta está rasa" sem ler o prompt inteiro do log.

---

## Arquivos afetados

- `supabase/functions/slack-bot/index.ts` — remover gate de persona em `prep_1on1_brief`, tratar `Forbidden` do briefGenerator.
- `supabase/functions/_shared/briefGenerator.ts` — adicionar 3 blocos de contexto + ajuste de prompt + telemetria.
- Sem migrations, sem mudança de schema, sem mudança de UI.

## Validação

1. **Bug do líder**: pedir ao Matheus para clicar "Gerar Pauta" no card da Yasmin novamente — deve gerar a pauta (não mais "Apenas líderes…").
2. **Pauta enriquecida**: comparar a próxima pauta gerada com a anterior — deve referenciar datas/temas das últimas 1:1s e citar o último mensal/trimestral confirmado quando existir.
3. **Sem regressão**: liderado sem nenhuma 1:1 registrada ainda deve continuar recebendo pauta com tópicos genéricos (check-in + prioridades), não erro.

## Fora de escopo (proposto separar)

- Migrar `briefGenerator.ts` para `composeSystemPrompt()` do soul loader (dívida técnica conhecida em `mem://ai/soul-centralizada-md`) — recomendo abrir como passo seguinte, não misturar com o fix urgente.
- Repensar `getUserPersona()` para suportar papel híbrido "líder E liderado" — afeta outros comandos (`/nota`, `/brief` via slash, `/mentor`); merece plano próprio.
