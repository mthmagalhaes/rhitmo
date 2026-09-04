# Rhitmo 2.0 — executar os três pilares sem esperar validação externa

Decisão desta sessão: o gate de adoção (40% de líderes novos com note taker conectado) deixa de bloquear os pilares novos. Otter fica fora. Os três pilares entram em sequência, um bloco por vez, cada bloco fecha sozinho antes do próximo começar.

O plano mestre (`.lovable/plan/rhitmo-2-0-plano-mestre-2026-09-04.md`) será atualizado para registrar que o gate foi suspenso por decisão do fundador — não quero que uma sessão futura reabra essa discussão como se fosse erro.

## O que já existe hoje (medido no banco agora)

| Matéria-prima | Volume |
|---|---|
| Sinais brutos de Slack (ambient) | 6.330 |
| Evidências consolidadas | 4.988 |
| Anotações | 388 |
| Transcrições de reunião | 95 |
| Mensais confirmados | 14 de 20 |
| Trimestrais confirmados | 1 de 5 |
| Avaliações formais | 17 |
| Rede de colaboração (pares e sinais) | **0 — tabelas vazias** |

Ou seja: matéria-prima de evidência sobrando; camada de rede literalmente zerada. A aba "Rede" da tela de Contexto foi desligada no enxugamento justamente por isso.

## Ordem proposta

**Bloco 1 — Calibrações.** Usa o que já é forte (mensais, trimestrais, avaliações) e não depende de nada novo. É o pilar que entrega valor mais rápido.

**Bloco 2 — ONA passivo.** Precisa de trabalho de dados antes de qualquer tela: hoje não existe uma única linha de rede. Os 6.330 sinais de Slack são o combustível.

**Bloco 3 — Auto Draft.** Vem por último de propósito: escreve melhor quando já pode citar calibração e rede, além das evidências.

---

## Bloco 1 — Calibrações

Objetivo: o líder chega na conversa de calibração com um pré-read pronto, comparável entre pessoas, ancorado em evidência citável.

- **Pré-read por pessoa**: junta trimestrais confirmados, mensais do período, avaliações formais e evidências, e devolve classificação sugerida, risco, evolução versus o ciclo anterior e as citações que sustentam cada afirmação.
- **Visão de calibração do time**: uma grade com todas as pessoas do líder lado a lado (classificação sugerida, promoção, risco), para enxergar distorção antes da reunião. É essa visão que hoje não existe — o painel atual é por pessoa, dentro da avaliação.
- **Ata da calibração**: o que foi decidido fica gravado como decisão do ciclo, com quem decidiu e quando, e vira insumo do ciclo seguinte.
- **Guardrails**: nada de classificação automática silenciosa. A IA sugere, o líder confirma; sem confirmação, nada entra no histórico.

Pronto quando: um líder da Faster abre a grade do time, ajusta, confirma e a ata fica registrada.

## Bloco 2 — ONA passivo

Objetivo: responder "quem trabalha com quem de verdade", sem pesquisa e sem pedir indicação manual.

- **Construtor de rede**: rotina diária que lê sinais de Slack, participantes de reunião e menções em evidências, e escreve as arestas de colaboração com peso e recência. Hoje essa rotina não existe (a função de detecção citada em memória não está no projeto).
- **Backfill histórico**: rodar sobre os 6.330 sinais já capturados para a rede nascer povoada, não vazia.
- **Detector de sinais**: queda de colaboração, isolamento, sobrecarga de um nó, dependência de pessoa única. Sinal aparece com a evidência que o gerou e pode ser dispensado pelo líder.
- **Religar a aba "Rede"** na tela de Contexto e reativar o cartão de relacionamentos, agora com dado real.
- **Privacidade**: rede mostra intensidade e padrão de colaboração, nunca conteúdo de mensagem. Visão de RH continua sem conteúdo, só agregado.

Pronto quando: a aba Rede mostra a rede real da Faster e ao menos um sinal com evidência ligada.

## Bloco 3 — Auto Draft

Objetivo: a Rhitmo escreve o primeiro rascunho, o líder edita — em vez de encarar página em branco.

- **Rascunho de avaliação formal** a partir de mensais, trimestrais, evidências e agora também da rede e da calibração.
- **Rascunho de pauta de 1:1** com o que mudou desde a última conversa.
- **Regra dura**: toda afirmação carrega citação rastreável. Frase sem evidência não entra no rascunho.
- **Sempre rascunho**: nunca envia, nunca compartilha sozinho.

Pronto quando: um líder gera o rascunho, edita e conclui uma avaliação sem escrever do zero.

---

## Notas técnicas

- **Bloco 1**: nova RPC de pré-read agregando `quarterly_recaps`, `monthly_recaps`, `performance_reviews` e `context_evidence`; nova tela de grade em `/lider/avaliacoes`; tabela de ata de calibração (com GRANTs e RLS por `leader_user_id`). Reaproveitar `ReviewCalibrationPanel.tsx` como detalhe por pessoa.
- **Bloco 2**: edge function `detect-network-signals` (cron diário), populando `team_network_edges` e `network_signals` a partir de `slack_ambient_evidence`, `meeting_transcripts`/participantes e `context_evidence`; script de backfill; reativar aba em `src/pages/lider/Contexto.tsx` (linha 104) e `RelationshipSignalsCard.tsx`. RPCs `get_team_pulse`/`acknowledge_network_signal` já existem.
- **Bloco 3**: estender `generate-formal-review` e `generate-brief`; prompt via `composeSystemPrompt` em `_shared/soul/*.md`, nunca inline; modelo padrão `google/gemini-2.5-flash`, escalonando só em análise profunda.
- Padrões obrigatórios em toda função nova: JWT, ownership chain antes de service_role, `safeSupabase`, CORS em toda resposta, logger estruturado.
- Nenhuma migração destrutiva. Otter permanece fora do catálogo de conectores.

## Como vamos tocar

Um bloco por vez, com verificação real no banco ao fim de cada um antes de abrir o próximo. Se um bloco revelar que a matéria-prima não sustenta a promessa (risco maior no Bloco 2), eu paro e te conto em vez de entregar tela bonita com dado fraco.
