## Mentor Chat 2.2 — Polimento de resposta (estilo Windy onde faz sentido)

Quatro mudanças cirúrgicas, sem descaracterizar o tom de coach do Mentor.

### 1. Capabilities mode (pergunta tipo "o que você faz?")

**Onde:** `supabase/functions/chat-mentor/index.ts`

Adicionar detector simples (regex em PT-BR) **antes** da chamada à LLM:
- Padrões: `o que (você|vc) (faz|pode fazer|consegue|me ajuda)`, `como (você|vc) (me )?ajuda`, `quais (são )?(suas|tuas) (capacidades|funções|funcionalidades)`, `me apresenta`, `o que é (esse|este) (mentor|chat)`.
- Quando casar **e** `mode === 'leader_self'` **e** sem `conversationHistory` (primeira msg da thread), responder com payload **estático** estilo Windy — sem chamar LLM:

```
Aqui está como posso te ajudar como **Mentor Rhitmo**:

---

### 🧠 Reflexão sobre sua liderança
- Discutir desafios atuais e pontos cegos
- Conectar sua intenção (perfil) com sua prática (notas do time)
- Provocar sobre legado, energia e desenvolvimento

### 👥 Análise de liderados específicos
- Resumir histórico, padrões e sentimento por pessoa
- Preparar conversas difíceis (1:1s, feedbacks, PDI)
- _Selecione a pessoa em "Trocar contexto" no topo_

### 📊 Padrões do time
- Identificar tags recorrentes nas suas notas
- Detectar contradições ("Watermelon": tudo verde por fora…)

### 🎯 Síntese acionável
- Toda análise termina com 3 bullets: insight, padrão, ação imediata
```

Para `mode === 'member'`, variante curta mencionando o nome do liderado.

**Por quê estático:** zero latência, zero custo, formatação garantida (resolve a queixa de "não tive resposta nenhuma" + dá o tom Windy).

### 2. Bullets paralelos como default

**Onde:** `_shared/rhitmo-leader-coach.ts` linhas 92-98 + bloco equivalente no system prompt do modo `member` em `chat-mentor/index.ts` (~linha 631-684).

Trocar a regra atual de formatação por:

```
## DIRETRIZES DE FORMATAÇÃO

1. Comece com **uma frase-resumo (1 linha)** que sintetize a resposta. Sem saudação.
2. Use H3 (`###`) com emoji para separar seções.
3. Bullets **sempre paralelos**: comece com verbo no infinitivo ou substantivo, mantenha o mesmo padrão dentro de cada lista.
4. Bullets curtos (≤ 18 palavras). Sem parágrafos densos.
5. **Negrito** apenas em conceitos-chave (1–2 por seção).
6. Encerre análises com `### 🎯 Síntese Honesta` (3 bullets: insight, padrão, ação imediata).
```

### 3. Slack: degradar markdown corretamente

**Onde:** `supabase/functions/slack-bot/index.ts` linha ~1086 (handler `/mentor`).

Hoje o `reply.substring(0, 3000)` é jogado como `mrkdwn`, mas o Mentor devolve `### Título` e `**negrito**` (markdown padrão), que o Slack não renderiza.

Criar helper local `markdownToSlackMrkdwn(text)`:
- `### Título` → `*Título*\n` (Slack só tem 1 nível de bold)
- `## Título` → `*Título*\n`
- `**texto**` → `*texto*`
- `__texto__` → `_texto_`
- `- ` no início de linha → `• `
- Manter emojis e quebras de linha
- Truncar inteligentemente em 2900 chars (preservar última quebra de parágrafo)

Aplicar ao `reply` antes de inserir no bloco.

### 4. Lead de abertura (1 linha)

Já fica coberto pela regra (1) da mudança #2 do prompt. Sem código adicional.

---

## Arquivos modificados

- `supabase/functions/chat-mentor/index.ts` — detector capabilities-mode + curto-circuito antes da LLM; ajuste no system prompt do modo member.
- `supabase/functions/_shared/rhitmo-leader-coach.ts` — bloco "Diretrizes de formatação" reescrito.
- `supabase/functions/slack-bot/index.ts` — helper `markdownToSlackMrkdwn` + aplicação no handler `/mentor`.

## Fora de escopo (intencional)

- Não mexer em CitationChip / `[doc:UUID]` (já funciona).
- Não tocar em `MentorChat.tsx` na web (o markdown já renderiza via `react-markdown`).
- Não mudar o tom de coach do modo análise — só padronizar a forma.
