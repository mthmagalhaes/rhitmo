## Diagnóstico

O app no Slack **não está mais quebrado tecnicamente** (chat-mentor responde, RAG está ativo, x-cron-secret funciona). O que aconteceu é uma regressão de **qualidade/tom** no modo `leader_self` — a IA está alucinando estatísticas e despejando templates onde deveria conversar. Três causas concretas no código:

### 1. Prompt do leader-coach força template em TODA resposta

`supabase/functions/_shared/rhitmo-leader-coach.ts` (linhas 92–99) obriga:

- H3 com emoji em toda resposta
- Sempre encerrar com `### 🎯 Síntese Honesta` (3 bullets: insight, padrão, ação imediata)

Resultado: quando o usuário diz "O que é isso?", a IA não responde curto — ela despeja uma análise completa de coaching. A primeira mensagem da transcrição (a que parece "alucinada") é exatamente isso: a IA respondeu a um "oi" / abertura como se fosse um pedido formal de análise.

### 2. Alucinação de estatísticas a partir de tokens crus

`supabase/functions/chat-mentor/index.ts` (linhas 534–546) injeta `teamPatternsSummary` com tokens internos brutos:

```
- Por tipo: note: 20, autonomy_check: 4, ...
- Por sentimento: neutral: 30, ...
- Tags recorrentes: ...
```

Como o prompt **exige** o bullet "Padrão" na Síntese, a IA pega esses tokens crus (`autonomy_check`, `note`) e narra como se fossem insights reais ("Seu estilo `autonomy_check` é lido como distanciamento", "75% das suas 40 notas são neutras"). Os números até existem — mas a interpretação é inventada.

### 3. Instrução "Trocar contexto" é UI da web, não existe no Slack

`rhitmo-leader-coach.ts` linha 62 e `chat-mentor/index.ts` linha 122 mandam o usuário "selecionar a pessoa no canto superior direito ('Trocar contexto')". No Slack não há esse dropdown — o caminho correto seria `/rhitmo @nome` ou orientar a abrir o app web. A IA repetiu literal essa frase.

## Plano

### Passo 1 — Tornar o leader-coach conversacional, não templated

Em `supabase/functions/_shared/rhitmo-leader-coach.ts`, ajustar a seção "DIRETRIZES DE FORMATAÇÃO":

- **Resposta proporcional ao input**: saudação curta → resposta curta. Pergunta meta ("o que é isso?", "quem é você?") → explicação direta sem template de coaching.
- **Síntese Honesta opcional**, só quando o usuário pediu uma análise de fato (não em toda mensagem).
- Tirar a obrigatoriedade de emoji+H3 em toda resposta; manter como recurso disponível, não default.
- Adicionar regra explícita: "Se o usuário só cumprimentou ou perguntou meta, responda em 1–3 linhas."

### Passo 2 — Parar de vazar tokens crus para o LLM

Em `chat-mentor/index.ts` (~534–546), traduzir os tokens antes de mandar pro modelo:

- Mapear `evidence_type` (`note`, `autonomy_check`, `pulse_response`, ...) para rótulos PT-BR ("notas livres", "checagem de autonomia", "resposta de pulse").
- Se `teamPatternsSummary` estiver vazio ou abaixo de N evidências, mandar uma frase explícita: "Ainda não há padrões agregados suficientes para análise estatística — não invente percentuais." em vez de despejar contagens vazias.
- Adicionar instrução no prompt: "NUNCA cite percentuais que não estão explicitamente listados acima."

### Passo 3 — Adaptar instruções "Trocar contexto" ao canal Slack

- Em `chat-mentor/index.ts`, aceitar um campo `channel: 'web' | 'slack'` no body. `slack-bot/index.ts` já pode passar `channel: 'slack'` no payload `leader_self`.
- Em `rhitmo-leader-coach.ts`, condicionar a frase de redirecionamento:
  - Web: "selecione a pessoa em 'Trocar contexto' no topo"
  - Slack: "use `/rhitmo @nome` ou peça aqui mesmo: 'me fala sobre o Guilherme' que eu busco no histórico dele"
- Na verdade, se o pedido é "Como o Guilherme tem se comportado?" e o nome bate com um liderado conhecido (`directReportsList`), o bot deveria **chamar o modo `member**` automaticamente em vez de redirecionar. Esse é um upgrade maior — fica fora deste plano e vira candidato a sprint próxima. Por agora, só corrigir a frase de fallback.

### Passo 4 — Validação

- `supabase--curl_edge_functions` em `chat-mentor` com `mode=leader_self`, `question="O que é isso?"` → resposta deve ser curta (≤3 linhas), sem Síntese Honesta.
- Mesmo endpoint com `question="Faz uma análise de como estou liderando"` → resposta completa com Síntese Honesta (caso legítimo).
- Mesmo endpoint com `question="Como o Guilherme tem se comportado?"` + `channel="slack"` → resposta de redirecionamento usando `/rhitmo @Guilherme`, não "Trocar contexto".
- Smoke test no Slack DM real após deploy.

## Arquivos afetados (escopo)

- `supabase/functions/_shared/rhitmo-leader-coach.ts` — relax do template + instrução condicional por canal
- `supabase/functions/chat-mentor/index.ts` — tradução de tokens, guard contra alucinação numérica, propagar `channel`
- `supabase/functions/slack-bot/index.ts` — passar `channel: 'slack'` no payload `callDmMentor`

**Faça também:** roteamento automático leader_self → member quando o líder cita o nome de um liderado (vale uma feature dedicada com resolver de nome + confirmação).