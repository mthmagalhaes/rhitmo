# Rhitmo v2: conector-first, bot como add-on

Pivot completo do modelo: o plano base deixa de comprar minuto de máquina e passa a ler o que a empresa já captura. O bot vira add-on por assento. Depois disso, e só depois, sobem quatro pilares no estilo Windmill (Auto Draft, Calibrações, ONA passivo, pesquisas de engajamento), cada um com sua própria condição de liberação.

Construção como **novo sistema paralelo** (rotas `/v2/*` sob uma flag de workspace), reaproveitando tudo que já existe no backend. A plataforma atual continua intacta e funcional durante toda a migração.

## Novo projeto ou mesmo projeto?

Recomendação: **mesmo projeto**, com o v2 em rotas próprias. Um projeto novo teria backend novo — outro banco, outro Auth, outros webhooks de Stripe, Slack, Google Calendar e Recall — e os dados que dão valor à Rhitmo (evidências, transcrições, sinais de rede, avaliações, embeddings) ficariam do lado velho. Você acabaria mantendo duas plataformas de verdade e migrando dados no fim, que é exatamente o risco que queremos evitar.

Ficando no mesmo projeto você ganha o efeito de "começar do zero" onde ele importa (telas, navegação, pricing, onboarding) sem repagar o que já está pronto e testado (RLS, Soul da IA, conectores, e-mail, Slack, cron).

Projeto novo só se valeria a pena em dois cenários: se o v2 fosse para outro público com outro domínio e outra marca, ou se você quisesse descartar a base de dados atual. Nenhum dos dois é o caso aqui.


## Estado atual verificado

- Nenhuma assinatura ativa (`subscriptions`: 0 active). Mudar preço agora não quebra ninguém pagante.
- 9 workspaces, todos `paid_seats = 0`; 6 com `grandfather_until = 2026-11-08`.
- Teto de bot já existe e é enforçado: RPC `get_bot_hours_usage` + código `recall_hours_cap` em `schedule-recall-bot`, medição em `bot_usage_events`.
- Conector de note taker existe, mas amarrado ao Granola: `note-taker-connect` valida `provider: z.literal("granola")` e `noteTakerSync.ts` importa `granolaClient.ts` direto.
- Base para ONA já existe: `network_signals`, `team_network_edges`, `peer_feedback_requests`, `review_peers`, RPC `get_team_pulse`.
- `pulse_surveys` existe (21 colunas) e alimenta `ctx_evidence_from_pulse_survey`.

## Modelo comercial novo (preço final)

| | Grátis | Rhitmo (assento) | Add-on Bot |
|---|---|---|---|
| Preço | R$ 0 | R$ 10/assento/mês | R$ 19,90/assento/mês |
| Assentos | líder + 3 liderados | ilimitados | ativado individualmente por assento |
| Bot | 5h de trial única (vitalícia, não mensal) | 0h inclusas | 4h/mês por assento |
| Conectores, Anotações & Evidências, briefs, avaliação, Mentor | sim | sim | — |

Total de referência: assento com bot ativo = R$ 10 + R$ 19,90 = **R$ 29,90/assento/mês**. Esse R$ 29,90 é o total combinado, não o preço do assento — não confundir com o rascunho anterior, em que R$ 29,90 era o assento sozinho. Ponto de comunicação: queda de ~40% frente aos R$ 49,90/assento hoje em produção.

Unit economics: sem add-on, o custo por assento é só IA (centavos), margem altíssima. Com add-on, o custo é 4h × R$ 4,20 = R$ 16,80, margem de ~15,6% sobre os R$ 19,90 do add-on isoladamente. 5h dariam prejuízo; 4h é o breakeven com margem positiva.

Grandfathering de 12 meses para quem já usa, comunicando queda de preço e não perda de produto.


## Fases

### Fase 0 — Fundação (não muda nada visível)
- Nova flag `workspaces.ui_version` (`v1` default, `v2` opt-in) e `workspaces.bot_trial_hours_used`.
- Tabela `seat_addons` (workspace, member/seat, tipo `bot`, horas incluídas, status) com GRANTs + RLS.
- `get_bot_hours_usage` passa a somar: trial restante + horas dos add-ons ativos do assento. Sem add-on e sem trial, teto zero.
- `usePlanLimits` ganha os novos constantes sem remover os antigos (v1 continua lendo o que lê hoje).

### Fase 1 — Conectores como produto
- Extrair interface `NoteTakerProvider` de `granolaClient.ts` (listar, buscar, e-mails, conteúdo, data).
- Um arquivo por serviço em `_shared/notetakers/`: `granola.ts` (migração do atual), `fireflies.ts`, `otter.ts`. `note-taker-connect` aceita enum de providers.
- Marcação de fidelidade por origem (`transcript` vs `summary`) na evidência, refletida na citação da avaliação formal.
- Nova página `/v2/conectores`: estado visível por conector (conectado, última sync, erro acionável), fila de notas sem liderado e chip de origem.
- Métrica de decisão: % de novos líderes que conectam note taker próprio (evento em `onboarding_funnel_events`).

**Decisão de ICP (set/2026):** o ICP da Rhitmo permanece **genérico, qualquer setor**. A hipótese de estreitar para tech-first foi avaliada e descartada. Consequência direta na fila de conectores: **não** entram GitHub, Linear ou equivalentes de engenharia por enquanto — eles só fariam sentido num ICP tech-first. A fila segue sendo note takers (Granola, Fireflies, Otter) + Slack + Calendar, que atendem qualquer setor.

### Fase 2 — Preço e add-on
- Dois SKUs novos no Stripe: **assento R$ 10/mês** (mensal e anual) e **add-on de bot R$ 19,90/mês por assento, com 4h/mês inclusas**.

- `create-checkout-session` ganha line item de add-on com quantidade = assentos com bot ativo; `stripe-webhook` sincroniza `seat_addons`.
- Nova `/v2/billing`: seletor de assentos, toggle de bot por liderado, uso de horas por assento, aviso em 80%.
- `schedule-recall-bot` passa a checar add-on do assento (ou trial) antes de agendar; mensagem de bloqueio oferece ativar o add-on ou conectar note taker.

## Gate depois da Fase 2 (o que pode avançar, e sob qual condição)

Nada depois da Fase 2 começa antes de Fase 0, Fase 1 e Fase 2 estarem no ar, nessa ordem. Além disso, cada pilar tem uma condição própria. O gate **não é mais único para todos**: ele diferencia território novo de reconstrução do que já falhou.

Os dois critérios em jogo são:

**(a) Sinal de adoção medido** — taxa de conexão de note taker ≥ 40% entre os novos líderes que passarem pela Fase 1, medida pelo evento `note_taker_connected` em `onboarding_funnel_events` (a métrica de decisão que a própria Fase 1 define).

**(b) Justificativa escrita do "por que agora"** — um novo arquivo de plano nomeando o gatilho de uso, quem puxa a feature e o que ela substitui no fluxo atual. "Porque o Windmill tem" não é resposta válida.

| Pilar | Precisa de (a)? | Precisa de (b)? | Por quê |
|---|---|---|---|
| Auto Draft | sim | não | Território novo; nunca existiu e nunca falhou. |
| Calibrações | sim | não | Território novo; nunca existiu na Rhitmo. |
| ONA passivo | sim | **não** | O mecanismo mudou (ver abaixo); a resposta ao "por que desta vez" já está registrada neste documento. |
| Pulse Survey | sim | **sim** | Mecanismo inalterado: continua sendo coleta ativa, exatamente o que já falhou. |

### Por que ONA e Pulse têm tratamento diferente, se morreram juntos

ONA (Sprint 14) e pesquisas de engajamento (Sprint 9) foram removidas como código órfão em agosto por uso zero, inclusive dentro da Faster, o usuário mais cativo da Rhitmo. A causa raiz nos dois casos foi a mesma: **ambos exigiam que alguém parasse para preencher algo** — indicação manual de pares num caso, resposta de pesquisa no outro. Ninguém preencheu.

O ONA reconstruído **não pede nada a ninguém**. Ele observa sozinho quem já conversa com quem, a partir de sinais que já existem em produção: o Slack Ambient Mode (já no ar) e os conectores de note taker Granola/Fireflies entregues na Fase 1. Não há formulário, não há indicação manual, não há convite a responder. Como o mecanismo é genuinamente diferente do que falhou, o critério (b) já está satisfeito por este parágrafo — nenhuma sessão futura precisa reabrir a discussão nem escrever outro documento. O ONA continua esperando apenas o sinal de adoção (a).

O Pulse Survey continua atrás dos **dois** critérios porque nada mudou no mecanismo dele: ainda é perguntar ativamente e esperar resposta. Se um dia alguém propuser uma versão **passiva** de Pulse (por exemplo, inferir sentimento a partir do tom das mensagens no Slack em vez de perguntar), isso conta como justificativa nova e reabre a conversa. Não é o que está decidido agora.

Enquanto (a) não for medido, a prioridade de execução é **Fase 0 → Fase 1 → Fase 2**, sem pular para frente. Os pilares abaixo ficam documentados como intenção, não como trabalho autorizado.

### Pilar — Auto Draft (aguarda sinal de adoção)

- Botão "Rhitmo escreve o primeiro rascunho" em todos os tipos de avaliação (manager, self, upwards, peer), com progresso e cancelamento.
- Reusa `generate-formal-review` com parametrização por tipo; rascunho entra no editor Tiptap com citações auditáveis, nunca publicado automaticamente.

### Pilar — Calibrações (aguarda sinal de adoção)

Território novo no roadmap, sequenciado depois do conector-first validado. É o que transforma evidência acumulada em decisão coletiva de gente:

- **Comitê de calibração:** sessão com um grupo de líderes, cada liderado apresentado com as evidências reais já citáveis (feedbacks, 1:1s, avaliações), e registro da decisão calibrada.
- **9-box com dado real:** posicionamento derivado das evidências e avaliações existentes, não de digitação manual do gestor.
- **Pré-leitura com flags de viés por gestor:** antes do comitê, cada líder recebe o retrato do próprio padrão (severidade, recência, halo, viés de gênero/tempo de casa) usando o motor de bias detection já existente.

Reusa `performance_reviews`, `ctx_evidence` e o bias engine; nada disso exige coleta ativa nova.

### Pilar — ONA passivo (aguarda apenas o sinal de adoção)
- Grafo de colaboração inferido de sinais passivos: Slack Ambient Mode e notas dos conectores da Fase 1, sobre `team_network_edges`/`network_signals`.
- Nova página `/v2/rede`: quem trabalha com quem, intensidade e mudanças recentes, sem pedir input a ninguém.
- Alimenta o brief de 1:1 e, quando houver ciclo de avaliação, sugere pares automaticamente para o líder apenas aprovar (nunca o liderado indicando manualmente).

### Pilar — Pesquisas de engajamento / Pulse (aguarda os dois critérios)
- Construtor de perguntas (escala, eNPS, múltipla escolha, sim/não, texto) sobre `pulse_surveys`, com nova tabela de definição de pesquisa e respostas.
- Envio por Slack e in-app; resultado agregado na visão BP/RH e como evidência no contexto do liderado.


### Fase 6 — Corte do v1
Só depois que o v2 estiver completo e usado: promover `/v2/*` para as rotas principais e remover as telas antigas equivalentes.

## Detalhes técnicos

Migrações: `ui_version`/`bot_trial_hours_used` em `workspaces`; `seat_addons`; tabelas de definição/resposta de pesquisa; reescrita de `get_bot_hours_usage` (SECURITY DEFINER, plpgsql). Toda tabela nova sai com `GRANT` para `authenticated`/`service_role` e RLS por `leader_user_id`/workspace, seguindo o padrão do projeto.

Edge functions tocadas: `note-taker-connect`, `sync-note-taker`, `_shared/noteTakerSync.ts` (+ novo `_shared/notetakers/*`), `schedule-recall-bot`, `create-checkout-session`, `stripe-webhook`, `generate-formal-review`, `request-peer-feedback`. Padrão da skill `rhitmo-edge-function`: CORS, `getUser`, ownership chain, `safeSupabase`, prompts só em `soul/*.md`.

Frontend: novo shell `src/pages/v2/*` protegido por flag, importando componentes atuais onde já servem (`FormalReviewSheet`, `MemberMasterList`, `GranolaConnectorCard` generalizado). Nada em `src/pages/lider/*` e `src/pages/liderado/*` é removido nesta jornada.

Design: Creme/Bento mantido, `max-w-5xl`, Lora nos títulos e Inter no corpo, cantos `rounded-2xl`/`rounded-3xl` e sombras difusas.

## Riscos

- API de note taker instável: Magic Paste segue como plano B e o add-on de bot como rede de segurança.
- Qualidade desigual de entrada: nível de fidelidade explícito na citação.
- Percepção de downgrade: grandfathering de 12 meses e comunicação de queda de preço.
- Código duplicado durante o paralelo: mitigado pela Fase 6 com data alvo definida ao fim da Fase 5.
