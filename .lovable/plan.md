

## Melhorias de Inteligência do MentorChat

### Diagnóstico dos 3 Problemas

**1. Respostas genéricas e repetitivas**
- O modelo (`google/gemini-2.5-flash`) recebe `max_tokens: 1500`, o que limita a profundidade
- O system prompt tem ~5.000 tokens de instruções formatação/guardrails mas pouco espaço para raciocínio profundo
- No modo auto, envia apenas as **10 notas mais recentes** — pode não cobrir o contexto relevante
- O `conversationHistory` envia apenas `content` (texto), **perdendo o contexto de imagens anteriores** na thread
- O roteador semântico às vezes classifica como "NAO" perguntas que precisam de contexto (ex: "como responder a isso?")

**2. Imagem enviada sem texto resulta em fallback genérico**
- Linha 302: quando o usuário envia só imagem sem texto, o `finalMessage` fica vazio e o default é `"Analise esta imagem no contexto do liderado."` — genérico demais
- O texto default não instrui o modelo a fazer algo útil com a imagem
- A mensagem salva no banco é `[Imagem enviada para análise]` — sem contexto para a thread

**3. Qualidade inferior vs Claude/ChatGPT nas referências**
- `gemini-2.5-flash` é bom para velocidade mas fraco em nuance empática e coaching sofisticado
- `max_tokens: 1500` corta respostas ricas que precisariam de 2000-3000 tokens
- O prompt pede muitas coisas (formatação + análise + coaching + drafting + identidade) diluindo o foco

### Plano de Correções

**1. Upgrade de modelo: `gemini-2.5-flash` → `gemini-2.5-pro`** (para MentorChat líder)
- Pro tem raciocínio mais profundo, melhor para coaching e empatia
- Manter flash para Meu Rhitmo (liderado) por custo
- Adicionar `reasoning: { effort: "medium" }` para ativar thinking

**2. Aumentar `max_tokens` de 1500 para 3000**
- Permite respostas mais ricas e contextualizadas como as do Claude/ChatGPT

**3. Melhorar fallback de imagem sem texto**
- Trocar default de `"Analise esta imagem no contexto do liderado."` para prompt mais específico: `"Analise esta imagem detalhadamente. Se for uma conversa, identifique o contexto, as emoções envolvidas e sugira como eu poderia responder de forma empática e estratégica. Se for um documento ou gráfico, extraia os insights principais."`

**4. Expandir contexto automático de 10 para 20 notas**
- Mais histórico = padrões mais ricos, menos respostas genéricas

**5. Melhorar roteador semântico para imagens**
- Quando há `imageContent`, sempre buscar contexto (bypass router)
- Imagem com conversa de liderado PRECISA de histórico para ser útil

**6. Refinar system prompt — menos formatação, mais profundidade**
- Condensar seções de formatação (redundantes)
- Adicionar instrução explícita: "Evite respostas genéricas. Seja específico citando dados do histórico."

### Arquivos modificados

- `supabase/functions/chat-mentor/index.ts` — modelo, max_tokens, prompt, router bypass, contexto
- `src/components/MentorChat.tsx` — default text para imagem, expandir notas de 10 para 20

### Impacto de custo
- Gemini 2.5 Pro custa ~5x mais que Flash por token
- Com ~200 msgs/mês do líder principal: de ~$2/mês para ~$10/mês
- Justificável pelo valor de retenção do user principal

