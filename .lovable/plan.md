## Diagnóstico

O `slack-ambient-classifier` está rodando, mas captura pouco porque o desenho atual só pega o "topo" das conversas e descarta os formatos onde seu time de fato interage. Hoje temos **7 evidências em 3 canais** num workspace com 5 liderados muito ativos.

Os 4 buracos, em ordem de impacto:

### 1. Threads são invisíveis (maior buraco)
`conversations.history` retorna **apenas mensagens raiz**. Toda resposta dentro de thread (`thread_ts != ts`) só aparece via `conversations.replies`. Se a Yasmin abre um post e Guilherme/Laís/Giovanna/Gabriela respondem em thread, a gente vê só a Yasmin.

### 2. Só o autor vira evidência — menções e kudos cruzados se perdem
Se o Guilherme escreve "mandou bem demais @gabriela na call de hoje", a evidência hoje é atribuída ao **Guilherme** (autor), não à **Gabriela** (sujeito do reconhecimento). Em time pequeno e coeso, isso esvazia metade do sinal — reconhecimento e feedback público entre pares.

### 3. Reações/emojis são ignoradas
Não chamamos `reactions.get` nem lemos o array `reactions` que já vem em `conversations.history`. Um post de entrega com 🎉🚀✅ de 4 colegas é sinal forte de reconhecimento e hoje vale zero.

### 4. Filtro de ruído derruba ack curtos legítimos
`text.length < 20` descarta "entreguei o relatório", "subi em prod", "fechei o cliente X", "obrigado!", "feito ✅". Em chat corporativo brasileiro, muita evidência real cabe em <20 chars.

Bônus: `subtype` é descartado por inteiro, mas `thread_broadcast` e algumas mensagens com arquivo anexado têm subtype e são relevantes.

## O que mudar (escopo desta sprint)

Tudo dentro de `supabase/functions/slack-ambient-classifier/index.ts`. Sem mexer em schema, RLS, cron, prompts de produto ou UI.

### A. Ler threads
Para cada mensagem do `conversations.history` que tenha `reply_count > 0`, chamar `conversations.replies` e adicionar as respostas (sem a raiz, que já temos) na lista de candidatos. Mesmo filtro de ruído, mesmo pipeline LLM. Cap de 50 replies por thread, 20 threads por canal/run para conter custo e rate-limit.

### B. Atribuir menções como evidência secundária
Para cada mensagem que passar no LLM com `relevance_score ≥ 0.6` E tiver categoria `reconhecimento` ou `conflito`, extrair `<@U…>` do texto e, para cada usuário mencionado que resolva a um `team_member`, inserir uma **segunda linha** em `slack_ambient_evidence` com o membro mencionado como `member_id` e um campo `attribution = 'mentioned'` (default `'author'`). Isso preserva auditabilidade — mesma mensagem aparece no contexto do autor e do mencionado, com rótulo claro.

Requer migration mínima: `ALTER TABLE slack_ambient_evidence ADD COLUMN attribution text NOT NULL DEFAULT 'author' CHECK (attribution IN ('author','mentioned'))` + ajuste da unique constraint para incluir `attribution` (senão duplica).

### C. Capturar reconhecimento via reações
Quando `conversations.history` retornar `reactions: [{name, users[], count}]` numa mensagem cujo autor resolva a um `team_member` E a soma de `count` for ≥ 3, gerar uma evidência sintética `category='reconhecimento'`, `relevance_score = min(0.6 + 0.1*count, 0.95)`, `summary = "Post recebeu N reações (🎉, ✅, 🚀) de M colegas"`. Sem chamar LLM nesse caminho — economia + sinal claro.

### D. Afrouxar filtro de ruído
- Mínimo de 20 → **8 caracteres**.
- Deixar de descartar `subtype === 'thread_broadcast'` e `subtype === 'file_share'` (tem `text` legítimo).
- Manter regex de "só emoji / só URL / só pontuação".
- Manter `bot_id` como descarte.

### E. Instrumentação adicional
Adicionar ao `WorkspaceStats` os contadores: `threads_fetched`, `thread_replies_added`, `mention_evidence_added`, `reaction_evidence_added`. Sem isso a gente não consegue medir o ganho real desta mudança.

## Validação

Antes de mexer em UI:
1. Rodar `slack-ambient-classifier` manualmente.
2. Esperar `saved ≥ 30` numa run (vs 7 acumuladas em vários dias).
3. Conferir que aparecem evidências para os 5 liderados (Yasmin, Guilherme, Laís, Giovanna, Gabriela) — não só Yasmin.
4. Conferir pelo menos 1 evidência com `attribution = 'mentioned'` e 1 com origem em reação.

## Fora de escopo (deixar para depois)

- Search backfill histórico (`search.messages` para puxar últimos 30 dias).
- Detectar conflito implícito via padrão de reação 👎/😬/⚠️.
- DM ao liderado avisando que aquela mensagem virou evidência.
- Mudar prompt do Gemini.
- Mexer em `slack-weekly-rollup` ou `detect-network-signals` (essas se beneficiam automaticamente do volume maior).

## Riscos

- **Custo Gemini sobe** proporcional a replies de thread. Mitigar com caps já citados (50 replies/thread, 20 threads/canal).
- **Rate-limit Slack** com mais chamadas (`conversations.replies` por thread, `chat.getPermalink` por evidência). O `slackCall` já tem backoff 429; capar threads por run resolve.
- **Atribuição por menção pode gerar falso-positivo** ("não foi a @gabriela"). Por isso restringimos só a `reconhecimento` e `conflito` — categorias onde o LLM já filtrou intenção.
