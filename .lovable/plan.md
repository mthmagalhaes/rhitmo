
# Rhitmo Lean: de plataforma de gestão de pessoas para 2 promessas

## O diagnóstico (dados reais do banco, hoje)

Antes de opinar, medimos. Contagem de linhas por tabela em produção:

| Sinal | Número |
|---|---|
| Usuários cadastrados | 45 |
| Usuários com login nos últimos 30 dias | 2 |
| Feedbacks/Diário | 352 (270 transcrição, 42 bot, 37 manual) |
| Transcrições de reunião | 63 |
| Avaliações formais | 16 — **todas** `review_type = 'manager'` |
| Evidências de contexto | 2.997 (2.780 vêm do Slack ambient) |
| Mentor (mensagens / threads) | 127 / 40 |

E o outro lado da moeda — features construídas que **nunca foram usadas por ninguém**:

| Feature | Linhas |
|---|---|
| Pulse Surveys | 0 |
| Peer review (`review_peers`) | 0 |
| Peer feedback loop (`peer_feedback_requests`) | 0 |
| ONA / rede (`network_signals`, `team_network_edges`, `graph_events_raw`) | 0 |
| Bias detection | 0 |
| Mirror insights | 0 |
| Kudos | 0 |
| Job roles / role competencies | 0 |
| PDI (`development_plans`) | 1 |
| Goals/OKRs | 5 (já ocultos da sidebar) |
| Quarterly recaps | 5 |

Leitura de produto: **o produto tem ~12 features e 2 delas têm tração**. O custo não é só de bundle — é de superfície cognitiva no onboarding, de RLS para manter, de 86 edge functions, de crons rodando, e de um menu que promete mais do que entrega.

## As duas propostas de valor que ficam

**1. Diário de Contexto** — o líder joga tudo pra dentro (bot na reunião, upload, paste, Slack) e a Rhitmo organiza: TL;DR, tópicos, lente pessoal por liderado, "Pergunte à Rhitmo" sobre aquela reunião. É onde está 100% do volume real.

**2. Avaliação Formal com evidência rastreável** — o payoff do item 1. Chega o fim do ciclo e a review sai pronta, com citações datadas e pílulas clicáveis. É o "Service-as-Software" da visão original.

Tudo que não alimenta (1) ou não é consumido por (2) sai do caminho.

## O que sai — em 3 níveis de reversibilidade

### Nível A — Ocultar da navegação, manter dados e rotas (risco zero, reversível em 1 linha)
Mesmo padrão já usado com Objetivos e Frameworks.

- **Pulse** (`/lider/pulse`, `/liderado/pulse`) — 0 surveys criados. Sai da sidebar do líder e do liderado, sai do `TeamPulseBento` da home.
- **PDI** (`/liderado/pdi`) — 1 registro. Sai da nav do liderado.
- **Compass** (`/liderado/compass`) — hoje é a home do liderado; vira uma seção dentro de `/liderado/inicio` em vez de item próprio.
- **Contexto** (`/lider/contexto`) — sobrepõe o Diário conceitualmente. O feed cross-member vira uma aba dentro do Diário, não uma rota irmã.
- **HR Analytics / HR Teams / Competency Framework** — com 23 times e 2 usuários ativos, analytics de RH é resposta para uma pergunta que ninguém está fazendo ainda. Fica `/hr` (overview) + `/hr/pessoas`.

Resultado: sidebar do líder = **Início · Pessoas · Diário · Avaliações** (já é isso hoje, mas Pulse/Contexto ainda aparecem em outros pontos); sidebar do liderado = **Início · 1:1s · Avaliações**.

### Nível B — Desativar processamento de fundo (corta custo real de IA e cron)
Features com 0 uso que **mesmo assim rodam**:

- `detect-network-signals` (cron 03:30) — ONA sem dado nenhum.
- `request-peer-feedback` (cron 04:00) — 0 requests até hoje.
- `mirror-weekly` — 0 insights gerados.
- `generate-quarterly-recap-cron` + `quarterly-anniversary-cron` — 5 recaps em toda a base; manter geração sob demanda, desligar o cron.
- `hr-risk-alerts`, `slack-weekly-rollup`, `send-evidence-digest` — avaliar por último; dependem de superfícies que estamos escondendo.

Ação: desagendar os crons (não deletar as funções), remover as chamadas de UI correspondentes.

### Nível C — Remover código de verdade (só depois de A e B validados)
Componentes e edge functions que ficam órfãos após A e B: wizards de self/peer/upwards review, `SendPulseButton`/`PendingPulseAlert`, aba Rede do Contexto, extensão de bias detection no editor, `build-team-graph`. Isso é uma limpeza de segunda rodada — **não misturar com a primeira**, para conseguir reverter A/B sem conflito.

## Ponto de decisão que preciso de você

**Slack ambient** gera 2.780 das 2.997 evidências de contexto — 93% do pool. Mas gerou apenas 2 feedbacks no Diário. Ou seja: está capturando muito e convertendo quase nada em algo que o líder vê. Duas leituras possíveis:

- É o **motor silencioso** do RAG (a review formal fica melhor por causa dele) → mantém e nem toca.
- É **ruído caro** que infla o contexto sem melhorar output → desliga o classificador ambiente e mantém só o Slack como canal de conversa.

Minha recomendação: **manter por enquanto**, mas instrumentar — logar quantas dessas 2.780 evidências efetivamente entram no prompt de uma review formal. Se for <5%, desliga na próxima rodada.

## Sequência sugerida

1. **Semana 1 — Nível A.** Sidebar e rotas enxutas, redirects preservados. Nada quebra, nenhum dado se perde.
2. **Semana 1 — Nível B.** Desagendar os 5 crons de features mortas.
3. **Validar com os 2 usuários ativos** (você + 1) e com os próximos onboardings: o funil fica mais claro?
4. **Semana 3+ — Nível C**, com a lista de órfãos confirmada por varredura de imports.

## Notas técnicas

- Ocultar item de nav = comentar entrada em `src/lib/navigation.ts` (padrão já estabelecido no arquivo, com comentário explicando a decisão de produto).
- Rotas permanecem em `App.tsx` e `routeLoaders.ts` — links salvos, DMs antigas do Slack e e-mails continuam funcionando.
- Nenhuma migration destrutiva em A ou B. Tabelas com 0 linhas ficam de pé.
- Desagendamento de cron é `cron.unschedule('<job>')` — reversível com um `cron.schedule`.
- Os ganhos de bundle da rodada anterior (880 KB → 493 KB gzip) não se sobrepõem a este trabalho: aquilo foi carregamento, isto é superfície de produto.
