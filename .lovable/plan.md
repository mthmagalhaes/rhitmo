
## Diagnóstico (o que está limitando hoje)

**Sinais Slack (`slack_ambient_evidence`):**
- O classifier roda mensagem-a-mensagem. Cada reply curta ("mandou bem", "bele, vou alterar de tarde") é classificada isoladamente, sem ver a thread inteira. Por isso o `summary` fica genérico e o card mostra só a frase solta.
- Não armazenamos: tópico/tema da thread, transcrição da thread, nem uma análise executiva (o "porquê isso importa pro líder").

**Rede de colaboração:**
- Já temos `graph_events_raw` + `team_network_edges` (build-team-graph) e `network_signals` (isolate, super_connector, drop, spike). 
- Mas em `/lider/contexto` só existe a aba **Rede** com sinais derivados (alertas). Não há nada do tipo "com quem o Guilherme mais conversa" e "sobre quais temas".
- Não temos extração de temas/tópicos — `slack_ambient_evidence.category` é só entrega/bloqueio/reconhecimento/conflito/outro, sem domínio (cliente X, projeto Y, churn, criativo…).

---

## Proposta — 3 frentes

### Frente 1 — Classificação por thread (não por mensagem)

Mudar o `slack-ambient-classifier` para agrupar mensagens da mesma `thread_ts` antes de chamar o Gemini e gerar **uma evidência por thread** (não uma por reply).

Novo formato do prompt entrega:
- `thread_topic` (curto, 3–6 palavras: "Aditivo contrato cliente X", "Bug copy de tarefa anterior")
- `theme_tags` (array de 1–3 tags livres normalizadas: ["churn", "cliente-acme", "criativo"])
- `executive_summary` (1–2 frases, ângulo de gestão: o que aconteceu + por que importa pro líder)
- `key_quote` (a frase mais representativa da thread, citada literalmente)
- `participants` (Slack user IDs que falaram na thread → resolvidos pra `team_members`)
- `category` + `relevance_score` (igual hoje)

Replies que pertencem a thread já processada **não geram nova evidência** — apenas atualizam o `executive_summary`/`participants` se o líder ainda não revisou.

### Frente 2 — Card de sinal com contexto rico

Refazer o `EvidenceCard` (quando `source = slack`) pra mostrar:
1. Header: liderado, canal, "há X tempo", tag de categoria
2. **Análise executiva** (`executive_summary`) — em destaque, fonte serif
3. **Frase capturada** (`key_quote`) — em itálico, com aspas, abaixo
4. **Tema / Tópico** (`thread_topic` + chips dos `theme_tags`)
5. **Quem participou** (avatares dos `participants` resolvidos)
6. Footer: "Ver thread no Slack" · Aprovar · Virar nota · Dispensar

Isso resolve direto o problema das frases tipo "Obrigada timeeee" virando sinais sem sentido.

### Frente 3 — Nova visão "Rede & Temas" por liderado

Atualmente `/lider/contexto?tab=rede` mostra **alertas** da rede. Adicionar uma seção/aba **Mapa do liderado** (ou redesenhar a aba Rede em 2 colunas):

**A. Top colaboradores (últimos 30/90 dias)**
- Lê `team_network_edges` filtrado por `member_id = liderado`
- Top 5–8 pessoas com peso, mini-barra por canal (DM / thread / mention / reaction / meeting)
- Permite clicar e ver as últimas threads compartilhadas

**B. Temas em foco (últimos 30 dias)**
- Agrega `theme_tags` de `slack_ambient_evidence` aprovadas do liderado
- Word-cloud / lista ranqueada com contagem
- Cada tema abre as evidências relacionadas

**C. Resumo executivo do mês** (gerado sob demanda pelo Gemini)
- "Guilherme passou o mês majoritariamente em churn e renovação de contratos, conversando com Renato (ops) e Laís (criativo). Sinal de atenção: drop de interação com time de produto."

---

## Mudanças técnicas (resumo)

**Schema (`slack_ambient_evidence`):**
- `thread_ts` (já existe via `slack_message_ts`, mas adicionar `thread_root_ts text`)
- `thread_topic text`
- `theme_tags text[]`
- `executive_summary text`
- `key_quote text`
- `participants jsonb` (array de `{ member_id, slack_user_id, name }`)
- índice em `(manager_id, member_id)` + GIN em `theme_tags`

**Edge function `slack-ambient-classifier`:**
- Reescrever loop principal: agrupar por `thread_root_ts`, montar payload com todas as mensagens da thread (texto + autor), enviar ao Gemini em batch (1 thread = 1 item).
- Upsert por `(workspace_id, slack_channel_id, thread_root_ts)` em vez de `(channel, ts)`.

**Frontend:**
- `src/components/evidence/EvidenceCard.tsx` — novo layout pra `source=slack` com seções descritas na Frente 2.
- `src/components/context/SlackSignalsTriage.tsx` — usa o novo card; sem mudança estrutural grande.
- `src/components/context/MemberNetworkPanel.tsx` *(novo)* — Top colaboradores + Temas + Resumo executivo.
- `src/pages/lider/Contexto.tsx` — na aba **Rede**, dividir em 2 sub-abas: "Mapa" (novo) e "Alertas" (atual `NetworkSignalsFeed`).

**Hooks novos:**
- `useMemberCollaborators(memberId, windowDays)` — query em `team_network_edges`
- `useMemberThemes(memberId, windowDays)` — agrega `theme_tags`
- `useMemberMonthlyDigest(memberId)` — chama edge function de resumo executivo on-demand

**Brief & DMs Slack:** o `_shared/briefGenerator.ts` passa a usar `executive_summary` (em vez de `summary`) e a expor "Temas da quinzena" + "Top colaboradores" no bloco Contexto.

---

## Migração de dados existentes

As 43 evidências atuais ficam com `executive_summary = summary` e `thread_topic = null`. Um botão "Reprocessar com contexto de thread" (admin/owner) chama o classifier num modo backfill que recalcula só threads das últimas 4 semanas.

---

## Fora do escopo desta entrega
- Detecção de tópicos cross-time (clustering longitudinal de temas) — fica pra depois
- Heatmap visual da rede do time inteiro (já temos `network_signals`; o foco aqui é a visão **do liderado**, não do org)
- Integrações fora do Slack (GitHub/Linear/Jira) — Layer 2 do Windmill, projeto separado
