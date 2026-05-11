# Rhitmo no Slack: do "bot com botões" para "AI Assistant" nativo

## TL;DR
A Slack lançou em **2024–2025** uma stack inteira pensada para apps tipo Rhitmo (Chief of Staff conversacional): **AI Apps / Assistant API**, **streaming nativo** (`chat.startStream` / `appendStream` / `stopStream`, out/2025), **MarkdownBlock**, **suggested prompts**, **status "está pensando…"**, e **context awareness** (canal/thread em foco). Hoje usamos só a base "clássica" (events `message.im`, `app_home_opened`, slash commands, blocks normais). **Estamos ~40% do estado da arte.** A boa notícia: dá pra chegar em 90% com 3 sprints, sem trocar stack — só evoluindo o `slack-bot/index.ts` e o manifest.

---

## 1. Estado da arte hoje (out/2025) — o que a Slack oferece

**a) AI Apps / Assistant container** (`docs.slack.dev/ai/agents`)
- Manifest com `assistant_view.assistant_default_action` + scope `assistant:write` transforma a DM do bot num **painel de chat dedicado tipo ChatGPT** dentro do Slack (split-view, histórico de threads, "New chat", "ações sugeridas").
- Eventos novos: `assistant_thread_started`, `assistant_thread_context_changed` (sabe em qual canal/thread o usuário está olhando enquanto conversa com o app — perfeito pro "prepare a 1:1 desse canal").

**b) Streaming nativo de respostas LLM** (changelog 07/10/2025)
- `chat.startStream` → cria placeholder; `chat.appendStream` → manda chunks; `chat.stopStream` → finaliza. UX = mensagem que "se digita sozinha", igual ChatGPT/Claude.
- Substitui o nosso "manda 1 mensagem grande depois de 8s de silêncio".

**c) `assistant.threads.setStatus`** → mostra "Rhitmo está pensando…", "consultando contexto da Maria…" — feedback contínuo sem poluir.

**d) `assistant.threads.setSuggestedPrompts`** → 1–4 chips clicáveis dinâmicos ("Gerar pauta da próxima 1:1", "Resumir feedbacks da semana", "O que mudou no time?"). Substitui nossos botões fixos.

**e) `assistant.threads.setTitle`** → renomeia a thread no painel ("1:1 com João — 12/mai").

**f) `MarkdownBlock` (`type: markdown`)** → manda markdown puro (tabelas, listas aninhadas, código) e o Slack renderiza fielmente. Hoje fazemos conversão manual mrkdwn que perde formatação.

**g) Block Kit AI components** → "feedback buttons" (👍/👎), "regenerar", "copiar" embutidos em respostas de IA.

**h) Context management best practices** (`docs.slack.dev/ai/agent-context-management`)
- Manter **state estruturado por thread** (não re-buscar tudo a cada turno).
- Usar `assistant_thread_context_changed` pra trocar o "modo" do agente conforme o usuário muda de canal.

**i) Tom & design tenets** (`docs.slack.dev/ai/agent-design`)
- Transparência ("estou consultando X"), respeito ao escopo do canal, ações destrutivas sempre confirmadas, minimizar blocos — privilegiar texto.

---

## 2. O que o Rhitmo já tem ✅ vs falta ❌

| Capability | Hoje | Estado da arte |
|---|---|---|
| Receber DM e responder com LLM (gemini-2.5-flash) | ✅ | ✅ |
| Slash commands curtos | ✅ | ✅ (continua válido) |
| Conversational state machine (`slack_conversations`) | ✅ | ✅ (já alinhado) |
| **Assistant container / AI App manifest** | ❌ | ✅ (`assistant:write`, `assistant_view`) |
| **Streaming de resposta** (`startStream/appendStream`) | ❌ aguarda resposta inteira | ✅ |
| **`setStatus` "pensando…"** | ❌ só log | ✅ |
| **`setSuggestedPrompts` dinâmicos** | ⚠️ parcial (botões fixos buildRhitmoMenu) | ✅ chips contextuais |
| **`setTitle` por thread** | ❌ | ✅ |
| **`MarkdownBlock`** | ❌ usa mrkdwn convertido | ✅ |
| **`assistant_thread_context_changed`** | ❌ | ✅ ("sabe que tô olhando #squad-x") |
| Botões 👍/👎 nas respostas (feedback loop) | ❌ | ✅ |
| Memória de thread estruturada (não só transcript bruto) | ⚠️ tem histórico, mas re-injeta tudo | ✅ summarize + state |
| Tom conversacional puro (sem flood) | ✅ (sprint passada) | ✅ |
| Multi-surface (responde em canal via `app_mention` mantendo contexto) | ⚠️ existe mas não compartilha state com DM | ✅ |

**Distância do estado da arte: ~40% pronto.** O resto é evolução, não rewrite.

---

## 3. Plano em 3 sprints

### Sprint A — "Vira AI Assistant de verdade" (1 semana)
Objetivo: mudar a UX de DM de "bot que responde" para **painel de assistente** estilo ChatGPT, sem mexer em LLM nem RAG.

1. **Atualizar manifest do app Slack** (entregar JSON pronto p/ usuário colar em api.slack.com):
   - Adicionar `features.assistant_view.assistant_default_action: "open_assistant_container"`.
   - Adicionar scopes `assistant:write` + manter `chat:write`, `im:history`, `im:write`.
   - Subscrever eventos `assistant_thread_started`, `assistant_thread_context_changed`.
2. **`slack-bot/index.ts`**: novos handlers
   - `assistant_thread_started` → chama `assistant.threads.setSuggestedPrompts` com 3 prompts contextuais por persona (líder vs liderado vs HR), e `setTitle` "Conversa com a Rhitmo".
   - `assistant_thread_context_changed` → grava `current_channel_id` em `slack_conversations` pra usar no próximo prompt do LLM.
3. **`setStatus`** em todo turno: antes da chamada Lovable AI → `"Rhitmo está pensando…"`; ao buscar contexto do RAG → `"consultando histórico de Maria…"`; ao terminar → `setStatus("")`.
4. **Remover botões fixos** do welcome/menu — virar apenas suggested prompts dinâmicos.

### Sprint B — "Streaming + Markdown rico" (3–4 dias)
1. Trocar `chat.postMessage` da resposta do LLM por **`chat.startStream` + `chat.appendStream` em chunks** (Lovable AI Gateway suporta SSE — propagar chunks até o Slack).
2. Adotar **`MarkdownBlock`** (`type: "markdown"`) para a resposta final → tabelas e listas aninhadas (briefs, recaps, peer feedback agregado) saem fiéis.
3. Adicionar bloco final com **botões 👍 / 👎 / "Refazer"** → grava em `slack_message_feedback` (nova tabela mínima) e usa pra evolução de prompt.

### Sprint C — "Context & memory de elite" (1 semana)
1. **Resumo incremental por thread** (state estruturado): após cada turno, gerar `thread_summary_jsonb` (objetivo atual, entidades mencionadas, próximas ações) — guardado em `slack_conversations`. No próximo turno, injeta o summary + últimas 4 msgs em vez de transcript inteiro. Reduz custo e latência (melhor margem L3, alinhado com `mem://monetization/modelo-economico-e-margens-abril-2026`).
2. **Awareness multi-surface**: quando `app_mention` chega em canal, herda a thread do assistant container do mesmo usuário (continuidade).
3. **Suggested prompts adaptativos**: gerar via LLM ao final de cada resposta (`setSuggestedPrompts` com follow-ups específicos: "Quer que eu agende a 1:1?", "Posto isso como nota privada?").
4. **Atualizar memória `mem://features/slack/conversational-first.md`** com novas regras (streaming obrigatório, status sempre, sem botões fixos).

---

## 4. Detalhes técnicos / riscos

- **Plano pago Slack**: AI Apps requerem workspace em plano pago do Slack para usar `assistant.threads.*` em produção. Funciona em sandbox grátis pro dev (Developer Program). Rhitmo precisa avisar customers free — a base bot continua funcionando como fallback.
- **Streaming + edge function Deno**: `chat.startStream` retorna `ts` da msg placeholder; precisamos manter conexão viva durante o stream. Edge function tem limite de 150s — ok pra respostas LLM (5–30s).
- **Connector gateway Slack**: precisamos validar se o connector Lovable expõe `assistant.threads.*` e `chat.startStream`. Se não, fazemos chamadas diretas via `SLACK_BOT_TOKEN` (já temos custom app — `mem://features/slack/custom-app-architecture-v2`).
- **Backwards compat**: manter slash commands `/rhitmo`, `/brief`, `/nota` para usuários que preferem atalhos — apenas reduzir output verboso.
- **Privacy**: `assistant_thread_context_changed` informa canais privados — nunca logar conteúdo, só IDs (segue `mem://features/slack/privacy-protection-layers`).

---

## 5. Métricas de sucesso
- Tempo para 1ª resposta visível (placeholder do stream): de ~6s → <1s.
- Mensagens por interação: hoje 1 grande; meta 1 (streaming) + chips de follow-up.
- Taxa de uso de suggested prompts vs digitar do zero: meta >40%.
- NPS interno do Slack-bot pós-Sprint C.

---

## 6. Diagrama do novo fluxo

```text
Usuário abre DM da Rhitmo
        │
        ▼
assistant_thread_started ─► setTitle + setSuggestedPrompts(3 chips contextuais)
        │
        ▼
Usuário digita / clica chip
        │
        ▼
setStatus("Rhitmo está pensando…")
        │
        ├─► RAG (resumos + ctx_evidence)         setStatus("consultando contexto…")
        │
        ▼
chat.startStream  ───►  chat.appendStream (chunks LLM)  ───►  chat.stopStream
        │
        ▼
MarkdownBlock final + 👍 / 👎 / Refazer + setSuggestedPrompts(follow-ups)
```

---

## 7. Próximo passo
Aprovando o plano, começo pela Sprint A (manifest + handlers `assistant_thread_*` + `setStatus`/`setSuggestedPrompts`). Sprint B e C ficam como entregas separadas para validarmos UX entre cada uma.
