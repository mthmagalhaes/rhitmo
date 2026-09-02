# Rhitmo v2: conector-first, bot como add-on

Pivot completo do modelo: o plano base deixa de comprar minuto de máquina e passa a ler o que a empresa já captura. O bot vira add-on por assento. Em paralelo, sobem três capacidades no estilo Windmill (Auto Draft, indicação de pares por ONA, pesquisas de engajamento).

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

## Modelo comercial novo

| | Grátis | Rhitmo (assento) | Add-on Bot |
|---|---|---|---|
| Preço | R$ 0 | R$ 29,90/assento/mês | por assento, com horas inclusas |
| Assentos | líder + 3 liderados | ilimitados | ativado individualmente |
| Bot | 5h de trial única (vitalícia, não mensal) | 0h inclusas | horas do add-on |
| Conectores, Anotações & Evidências, briefs, avaliação, Mentor | sim | sim | — |

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

### Fase 2 — Preço e add-on
- Novos preços no Stripe: assento R$ 29,90 mensal e anual; add-on de bot por assento.
- `create-checkout-session` ganha line item de add-on com quantidade = assentos com bot ativo; `stripe-webhook` sincroniza `seat_addons`.
- Nova `/v2/billing`: seletor de assentos, toggle de bot por liderado, uso de horas por assento, aviso em 80%.
- `schedule-recall-bot` passa a checar add-on do assento (ou trial) antes de agendar; mensagem de bloqueio oferece ativar o add-on ou conectar note taker.

### Fase 3 — Windmill: Auto Draft
- Botão "Rhitmo escreve o primeiro rascunho" em todos os tipos de avaliação (manager, self, upwards, peer), com progresso e cancelamento.
- Reusa `generate-formal-review` com parametrização por tipo; rascunho entra no editor Tiptap com citações auditáveis, nunca publicado automaticamente.

### Fase 4 — Windmill: indicação de pares por ONA
- Nova página `/v2/pares`: grafo de colaboradores do ciclo a partir de `team_network_edges`/`network_signals`.
- Limite de indicações por ciclo e aprovação do líder antes de disparar; convites reusam `peer_feedback_requests` e `review_peers`.

### Fase 5 — Windmill: pesquisas de engajamento
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
