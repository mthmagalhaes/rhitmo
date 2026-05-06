# Plano de execução — 20 direcionamentos do relatório

Vou agrupar as 20 decisões em **5 ondas** de execução, da mais destrutiva (remover) para a mais elaborada (rearquitetar). Cada onda é independente e pode ser entregue em PRs separados.

---

## Onda 1 — REMOVER do escopo do Líder (#6, #13, #14, #19)

São 4 features que saem do papel de Leader. Self/Peer/Upwards Review passam a ser **exclusivamente acionadas pelo RH Admin** como etapas de um ciclo formal. Chrome Extension some completamente.

### #6 Self-Review Wizard

- Remover `StartSelfReviewCard` do dashboard do liderado quando o líder for quem vê.
- Remover qualquer botão "Solicitar auto-avaliação" que tenha aparecido em telas de líder (não existe hoje, mas garantir que não seja criado).
- Manter o componente `SelfReviewWizard.tsx` no codebase, mas só renderizado quando houver um **ciclo ativo criado pelo RH Admin** (flag a ser usada na Onda futura de "Ciclos de Avaliação").
- Esconder a aba "Auto-avaliações" em `/lider/avaliacoes` (manter só "Formais escritas pelo líder" + "Recebidas por mim em ciclos RH").

### #13 Peer Review

- Remover `CreateFormalReviewDialog` opção `review_type='peer'` do fluxo do líder.
- Remover botão "Solicitar Peer Review" se existir em `/lider/avaliacoes`.
- Manter `review_peers` table + lógica de resposta do par (a UI do par continua igual — ele responde quando convidado).
- Quem dispara o convite passa a ser o RH Admin (a UI de disparo será movida pra `/hr` numa futura sprint de Ciclos).

### #14 Upwards Review

- Remover `UpwardsReviewWizard` (ou o ponto de entrada equivalente) do dashboard do liderado.
- Remover a evidência `review_type='upwards'` do mix do feed `/lider/contexto` (o líder não recebe upwards spontâneo — só dentro de ciclo).
- Manter schema `performance_reviews.review_type='upwards'` para uso futuro pelo RH Admin.

### #19 Chrome Extension

- Remover diretório `extension/` inteiro.
- Remover edge function `generate-extension-token` e hook `useExtensionToken`.
- Remover qualquer banner/CTA "Instalar extensão Chrome" da UI (provavelmente em `/lider/configuracoes` e onboarding).
- Remover linha do AccountSetupBento da Home se mencionar extensão.
- Atualizar memória `mem://features/conector-system/chrome-extension-technical` marcando como deprecada.

**Observação:** mantemos as tabelas e edge functions de Self/Peer/Upwards Review intactas no banco — apenas removemos os pontos de entrada na UI do líder. Quando o RH Admin lançar Ciclos, reaproveitamos.

---

## Onda 2 — DECIDIR: Brief 1:1 vs Contexto (#1 + #8)

Hoje os dois caminhos entregam valor parecido e o líder se confunde. Decisão: `**/lider/1on1s` vira o "produto principal"** — onde o líder vai antes de cada conversa. `**/lider/contexto` vira "feed de evidências brutas"** (não mais briefing executivo).

### Mudanças

- `**/lider/1on1s**` — mantém Brief AI + master-detail. Adiciona no header do brief: "Última atualização", botão "Atualizar agora", e atalho "Ver evidências completas → /lider/contexto?member=X".
- `**/lider/contexto**` — refatorar:
  - Remover `ExecutiveBrief` (4 blocos curados) do master-detail.
  - Voltar para o **feed cronológico cross-team** (RPC `get_team_timeline` que já existe no banco).
  - Reativar `EvidenceCard`, `SourceFilterChips`, `MemberFilterSelect` (estão no repo sem uso).
  - Função: "auditoria / drill-down". Quando o líder quer ler a evidência crua que gerou um insight no Brief 1:1, ele clica e vai parar aqui.
  - Esvaziar/desativar edge function `generate-context-brief` (ou manter só pra alimentar o Brief 1:1 internamente).
- **Comunicação visual** — copy nos dois headers explica:
  - 1:1s: "Resumo executivo pra você liderar a conversa"
  - Contexto: "Feed bruto de tudo que aconteceu — pra investigar"

### Memórias a atualizar

- `mem://features/context/feed-universal-page` — desfaz V2 e volta pro feed
- Nova: `mem://features/one-on-ones/brief-as-primary-surface`

---

## Onda 3 — Mentor Chat: potência + formatação + guard-rails (#2 + #5)

Duas frentes simultâneas no mesmo edge function `chat-mentor`.

### #2 Coaching Pessoal — exposição maior no UX

- Hoje só aparece quando o líder "esquece" de selecionar um liderado. Tornar **modo explícito**:
  - Em `/lider/mentor`, adicionar **toggle no topo** com 2 abas: **"Conversar comigo (coach)"** | **"Analisar um liderado"**.
  - Modo coach: ícone Sparkles, bg gradient sutil, copy "Reflita sobre sua liderança".
  - Modo liderado: força seleção de pessoa antes de habilitar o composer.
- No `MentorContextPanel` (sidebar direita), card "Contexto ativo" passa a refletir o modo escolhido.
- Slack: `/rhitmo coach` como atalho explícito (já temos infra de comandos).

### #5 RAG: formatação, guard-rails, anti-alucinação

- **Formatação** — reforçar no prompt do `chat-mentor`:
  - Lead de 1 linha (já existe na constituição do coach, replicar pro modo liderado)
  - H3 com emoji pra cada seção
  - Bullets paralelos ≤ 18 palavras
  - Sempre encerrar com `### 🎯 Síntese Honesta` (3 bullets)
- **Citações obrigatórias** — toda afirmação factual deve vir com `[doc:UUID]`. Se a IA emitir afirmação sem citação, log de warning e flag visual no frontend ("Esta resposta não cita fontes — verifique antes de agir").
- **Anti-alucinação** — adicionar guard-rail: se a similaridade RAG < 0.5 OU nenhum doc relevante encontrado, IA responde literalmente: "Não encontrei registros suficientes no histórico de [Nome] sobre isso." e para. Sem inventar. Além disso, criar guarda rails e prompts defensivos que evitam que os usuários façam prompt injection
- **Renderer** — `markdownCitations.tsx` já existe. Garantir que CitationChip + EvidenceDrawer estão ativos em todas as respostas (modo coach **não** usa citações; modo liderado **sempre** usa).

---

## Onda 4 — Bias Detection estilo Grammarly (#11)

Hoje `BiasUnderlineExtension.ts` já existe e marca palavras com underline + tooltip via `title`. Falta o "uau" do Grammarly.

### Mudanças

- **Underline visual** — substituir CSS `bias-underline` por wavy red/amber underline (text-decoration: wavy underline, cor por tipo: viés=âmbar, ambiguidade=azul, generalização=vermelho).
- **Hover popover** — substituir `title` HTML nativo por **Popover do shadcn** com:
  - Trecho destacado
  - Tipo do viés (badge colorido)
  - Sugestão concreta (1-2 alternativas)
  - Botão "Aplicar sugestão" (substitui o trecho inline)
  - Botão "Ignorar" (oculta marcação naquele trecho)
- **Contador no rodapé do editor** — "3 alertas de viés detectados" + botão "Revisar todos" que abre painel lateral com lista numerada.
- **Latência** — manter detecção 100% client-side (já é via ProseMirror). Debounce 400ms já existe.

### Memória

- Atualizar `mem://ai/bias-detection-strategy` com novo padrão UX Grammarly-like.

---

## Onda 5 — Refinamentos pontuais

### #18 Slack /kudos privado-only

- Remover opção "público no canal" do comando `/kudos`.
- Comportamento novo: `/kudos @pessoa <texto>` →
  1. DM privada do bot pro liderado: "Seu líder reconheceu: [texto]"
  2. INSERT em `feedback_notes` do liderado com `source='slack_kudos'`, `visibility='shared'`, `kind='kudo'`
  3. Aparece no Diário de Bordo do liderado E no feed `/lider/contexto`
- Atualizar `_shared/slackCommands.ts` + `slack-bot/index.ts`.
- Atualizar memórias `mem://features/slack/command-ecosystem` e adicionar `mem://features/feedback/kudos-as-private-recognition`.

### #20 Slack DM-only — copy menos assustadora

- Hoje o onboarding lista "o que NÃO fazemos" (parece defensivo).
- Reescrever pra tom de promessa: "Suas notas no Slack são suas. A Rhitmo só lê o que você marca explicitamente com `/nota`, `/kudos` ou DM direta. Nunca lemos canais, threads ou conversas que não te incluem."
- Aplicar em: tela de conexão Slack, Welcome DM, página `/lider/configuracoes` aba Slack.

### #9 PDI — simplificar

- Análise primeiro (não código nesta onda): ler `src/pages/liderado/PDI.tsx`, mapear pontos de fricção, e abrir issue separada com proposta. Provavelmente: reduzir campos do form, gerar 1ª versão do PDI via IA a partir do Compass + skills_data, e líder só comenta (não edita).

### #10 1:1s — integrações Linear/Notion

- **Confirmação:** hoje **NÃO existe** integração com Linear ou Notion. Só Slack, Recall.ai, Google Calendar.
- Opções:
  - (a) Remover qualquer copy/UI que insinue Linear/Notion (provavelmente em algum bento card "Conecte suas ferramentas").
- **Recomendo (a) agora**

---

## Features mantidas sem mudança

- #3 Magic Paste — ok
- #4 Slack `/brief` e `/meu-rhitmo` — ok
- #7 Pulse Surveys — ok
- #12 Slack Welcome DM — ok
- #15 Rhitmo Sync — não mexer
- #16 Recall.ai — manter
- #17 HR Analytics — manter

---

## Sequência sugerida de PRs

```text
PR1  Onda 1 — Remoções (Self/Peer/Upwards do líder + Chrome Extension)
PR2  Onda 5.1 — Kudos privado + Slack DM copy
PR3  Onda 5.2 — Remover copy de Linear/Notion (#10a)
PR4  Onda 4 — Bias Detection Grammarly-style
PR5  Onda 3 — Mentor Chat (modo coach explícito + guard-rails RAG)
PR6  Onda 2 — Brief 1:1 vs Contexto (mais arriscado, deixa pro fim)
PR7  Análise PDI (#9) — só relatório, sem código ainda
```

execute **na ordem PR1 → PR7** (mais seguro, valida onda a onda) 