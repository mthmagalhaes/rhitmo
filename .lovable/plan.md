
## Diagnóstico

### Problema 1 — "Como eu posso melhorar como líder?" sem retorno
A `chat-mentor` foi construída assumindo que **sempre existe um liderado-alvo**. O system prompt inteiro fala "você analisa o liderado X", o protagonista é `${memberName}`, todo o RAG filtra por `filter_member_id`. Quando o launchpad inicia uma thread sem `memberId`, o `MentorThread.tsx` faz fallback `memberName = userName` (o próprio líder) e manda `feedbacks=[]`. Resultado: a IA recebe instruções para analisar "Matheus" sem nenhum dado, dispara a regra anti-genericidade ("não há dados, sugira registrar notas") e devolve resposta vazia/inútil — exatamente o que você viu no screenshot 2.

### Problema 2 — Gabriela tem MUITO histórico, IA não captura
Hoje a recuperação é:
- Top 50 notas mais recentes por `occurred_at desc`, comprimidas até **20k chars** (`compressContext`).
- + RAG semântico (`match_feedbacks`, threshold **0.5**, **top 10**) na pergunta.
- Para cada nota: usa `summary` se existir, senão **trunca `content` em 800 chars**.

Limitações concretas para alguém com 100+ notas/transcrições:
- 50 mais recentes podem **enterrar** evidências antigas relevantes que o RAG não pegou (threshold 0.5 é alto, top 10 é pouco).
- Truncar transcrições em 800 chars perde o miolo da reunião.
- Não há recuperação por **tema/tag/tipo** (ex.: só transcrições, só pulses, só do último trimestre).
- Não passamos resumos pré-computados de `ctx_evidence` (que já existem!) — o RAG ignora todo o Context Graph que construímos nos sprints 8.x.

---

## Plano

### A. Modo "Líder" (autocoaching, sem liderado)

Quando a thread é criada sem `memberId`:

1. **Frontend (`MentorThread.tsx` + `Mentor.tsx`)**: parar de usar fallback `userName` como `memberName`. Passar explicitamente `mode: 'leader_self'` e **não** mandar `memberName`/`feedbacks`.
2. **`chat-mentor/index.ts`**: aceitar `mode` no payload. Se `mode === 'leader_self'`:
   - Pular a validação obrigatória de `memberName`/`feedbacks`.
   - Usar um **system prompt alternativo** (novo arquivo `_shared/rhitmo-leader-coach.ts`) focado em coaching do próprio líder: usa `leaderSyncData` (perfil de liderança que já enviamos), `keyObjectives` agregados do time, e dados agregados do líder (ver passo 3).
   - Guardrails: redirecionar perguntas que claramente são sobre um liderado específico ("Como cobro a Gabi?") com resposta curta sugerindo selecionar o liderado no header (botão "Trocar contexto").
3. **Contexto agregado do líder**: novo helper que busca:
   - Top 5 padrões recorrentes nas notas do time (via `ctx_evidence` recente, agrupadas por tag/sentimento).
   - Histórico de 1:1s do próprio líder (do `mirror_insights` / `useMirrorInsight`).
   - Recaps/diário recentes do líder (`weekly_reflection`).
   - Perfil completo `leader_sync_data`.
4. **UI no launchpad**: quando o líder digita sem selecionar liderado, mostrar **chip discreto** "Modo: Coaching pessoal" no header da thread (em vez de "— Gabriela Lucas (...)") para deixar claro qual modo está ativo. Templates do empty state ganham uma seção "Sobre você como líder" (ex.: "O que estou evitando essa semana?", "Onde estou perdendo tempo?", "Que viés apareceu nas minhas últimas notas?").

### B. RAG mais robusto para liderado com muito histórico

Mudanças em `chat-mentor/index.ts` (e RPC):

1. **Aumentar recall do semântico**: `match_threshold: 0.35` (de 0.5), `match_count: 25` (de 10). Custa pouco e resgata evidências menos óbvias.
2. **Incluir `ctx_evidence` no RAG**: criar/usar RPC `match_context_evidence` (mesma técnica do `match_feedbacks`, sobre embeddings de `ctx_evidence`). O Context Graph tem resumos curados de meetings/pulses/reviews/slack — é muito mais denso que feedbacks crus. Mesclar resultados (dedup por `source_id`).
3. **Janela de contexto adaptativa**: se RAG semântico retorna ≥15 hits relevantes (score > 0.55), aumentar `maxChars` de 20k → **40k**, e elevar `slice(0, 50)` para **80** notas no `compressContext`. Gemini 2.5 Flash aguenta 1M tokens; estamos sub-utilizando.
4. **Truncamento mais inteligente**: se `summary` ausente e `content` é transcrição (detector já existe via `isLongTranscript`), gerar **summary on-demand** para aquela nota (cache em memória dentro do request) em vez de truncar em 800 chars cegamente. Limite: até 3 sumarizações on-demand por request (custo controlado).
5. **Filtro por intenção**: roteador atual só decide "precisa contexto SIM/NAO". Estender para classificar **tipo de contexto**: `behavioral` (foca em pulses + slack), `delivery` (foca em meetings + goal_events), `relational` (foca em 1:1s + reviews). Passar como filtro na nova RPC. Reduz ruído sem perder profundidade.
6. **Logging visível**: já temos `log.info('end', { context_used, ... })`. Adicionar `evidence_breakdown: { from_recent: N, from_semantic_feedbacks: N, from_semantic_evidence: N, summarized_on_demand: N }` para debugar futuros casos como o da Gabriela direto nos logs.

### C. Validação rápida

- Reproduzir a tela 2 (sem liderado): garantir que retorna resposta útil em modo `leader_self`.
- Reproduzir a tela 1 (Gabriela): rodar 3 perguntas que hoje retornam "não encontrei registros" e confirmar que agora citam evidências antigas via RAG ampliado + ctx_evidence.

---

## Arquivos afetados

- `supabase/functions/chat-mentor/index.ts` — aceita `mode`, RAG ampliado, ctx_evidence, sumarização on-demand.
- `supabase/functions/_shared/rhitmo-leader-coach.ts` — **novo**: system prompt para modo autocoaching.
- Migration: nova RPC `match_context_evidence(query_embedding, threshold, count, filter_user_id)`.
- `src/pages/lider/MentorThread.tsx` — não forçar `memberName=userName`; passar `mode`.
- `src/pages/lider/Mentor.tsx` — templates "Sobre você como líder" no empty state quando nenhum liderado selecionado.
- `src/components/MentorChat.tsx` — header mostra "Coaching pessoal" quando `mode='leader_self'`; aceita `onSwitchContext` para trocar para um liderado mid-thread.
- `mem://features/mentor-chat/leader-self-mode.md` — documentar o novo modo.

## Fora de escopo (anotado para depois)

- Indexar transcrições inteiras como chunks separados (precisaria pipeline próprio de embedding por chunk; hoje embedamos a nota inteira).
- Memória de longo prazo cross-thread (lembrar que "líder já recebeu sugestão X mês passado").
- Streaming token-a-token (hoje é resposta completa).
