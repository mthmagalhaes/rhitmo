import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RHITMO_IDENTITY, GUARDRAILS_PROMPT, ANALYSIS_RULES } from "../_shared/rhitmo-constitution.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// CAMADA 1: ROTEADOR SEMÂNTICO ("O Porteiro")
// ============================================
const shouldFetchContext = async (
  question: string, 
  openAIApiKey: string
): Promise<boolean> => {
  const routerPrompt = `O usuário disse: "${question}".

Para responder isso com qualidade, é OBRIGATÓRIO ler as anotações e feedbacks históricos do liderado?

Exemplos de "NAO":
- Saudações ("Oi", "Olá", "Bom dia")
- Pedidos genéricos de formatação ("Formata isso em bullets")
- Perguntas sobre você ("O que você faz?", "Quem é você?")
- Continuação de conversa sem mudar de tema
- Agradecimentos ("Obrigado", "Valeu")

Exemplos de "SIM":
- Perguntas sobre comportamento ("Como a Gabriela se comporta em reuniões?")
- Análise de padrões ("Quais são os pontos fortes do João?")
- Preparação para 1:1 ("Me ajuda a preparar a 1:1")
- Sugestões de PDI ("O que posso sugerir de desenvolvimento?")
- Pedidos de feedback ("Como cobro o relatório?")
- Análise de riscos ("Devo me preocupar com algo?")

Responda APENAS "SIM" ou "NAO" (sem acento, sem explicação).`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: routerPrompt }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.log('Router failed, defaulting to SIM');
      return true;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim()?.toUpperCase();
    console.log('Router decision:', answer);
    
    return answer !== 'NAO';
  } catch (error) {
    console.error('Router error, defaulting to SIM:', error);
    return true;
  }
};

// ============================================
// CAMADA 2: COMPRESSÃO DE CONTEXTO ("A Prensa")
// ============================================
const compressContext = (feedbacks: any[]): string => {
  if (!feedbacks?.length) return 'Nenhum histórico disponível ainda.';
  
  // Ordenar por occurred_at DESC (mais recentes primeiro)
  const sorted = [...feedbacks].sort((a, b) => {
    const dateA = new Date(a.occurred_at || a.created_at);
    const dateB = new Date(b.occurred_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });
  
  const limited = sorted.slice(0, 50);
  let contextLines = '';
  let totalChars = 0;
  const maxChars = 20000; // Aumentado de 5000 para 20000
  
  for (let idx = 0; idx < limited.length; idx++) {
    const fb = limited[idx];
    const date = new Date(fb.occurred_at || fb.created_at).toLocaleDateString('pt-BR');
    const typeLabel = fb.type || 'Nota';
    
    // Compressão inteligente: prefere summary, senão corta content em 800 chars
    let text = fb.summary;
    if (!text || text.length < 20) {
      text = fb.content.substring(0, 800);
      if (fb.content.length > 800) text += '...';
    }
    
    const noteText = `[Data: ${date}] [Tipo: ${typeLabel}]\n${text}\n---\n\n`;
    
    if (totalChars + noteText.length > maxChars) break;
    
    contextLines += noteText;
    totalChars += noteText.length;
  }
  
  return contextLines || 'Nenhum histórico disponível ainda.';
};

// Helper: Formatar perfil Rhitmo Sync
const formatWorkStyle = (data: any): string => {
  if (!data) return 'Perfil Rhitmo Sync: Não preenchido ainda.';
  
  const styleLabels: any = {
    processing: { direct: 'Direto ao ponto', contextual: 'Contexto completo' },
    feedback: { immediate: 'Feedback na hora', scheduled: 'Feedback na 1:1' },
    autonomy: { directed: 'Direcionamento claro', autonomous: 'Autonomia' },
    energy: { morning: 'Produtivo pela manhã', evening: 'Produtivo à tarde/noite' },
    motivation: { recognition: 'Reconhecimento', growth: 'Crescimento' }
  };

  return `Perfil Rhitmo Sync:
- Comunicação: ${styleLabels.processing[data.processing] || data.processing}
- Feedback: ${styleLabels.feedback[data.feedback] || data.feedback}
- Autonomia: ${styleLabels.autonomy[data.autonomy] || data.autonomy}
- Energia: ${styleLabels.energy[data.energy] || data.energy}
- Motivação: ${styleLabels.motivation[data.motivation] || data.motivation}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, feedbacks, memberName, memberRole, managerName, workStyleData, keyObjectives } = await req.json();

    console.log('Chat mentor 2.0 request:', { memberName, memberRole, managerName, feedbacksCount: feedbacks?.length, hasWorkStyle: !!workStyleData });
    
    // Extrair primeiro nome para flexibilidade de apelidos
    const firstName = memberName ? memberName.split(' ')[0] : '';
    
    // Extrair dados do gestor para o Protocolo de Identidade Blindada
    const targetManagerName = managerName || 'o gestor';
    const managerFirstName = targetManagerName.split(' ')[0];

    if (!question || !feedbacks || !memberName) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros inválidos: question, feedbacks e memberName são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar API Key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de API ausente. Contate o administrador.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // CAMADA 1: ROTEAMENTO
    // ============================================
    const needsContext = await shouldFetchContext(question, openAIApiKey);
    console.log('Router decision - needs context:', needsContext);

    // ============================================
    // CAMADA 2: COMPRESSÃO (apenas se necessário)
    // ============================================
    let contextLines = '';
    if (needsContext) {
      contextLines = compressContext(feedbacks);
      const notesCount = (contextLines.match(/\[Data:/g) || []).length;
      console.log('Context compressed:', { 
        chars: contextLines.length, 
        notesIncluded: notesCount
      });
    } else {
      contextLines = '(Contexto histórico não foi necessário para esta pergunta - respondendo diretamente)';
      console.log('Context skipped by router');
    }

    // Seção de Objetivos (condicional)
    const objectivesSection = keyObjectives && keyObjectives.trim()
      ? `## 🎯 OBJETIVOS DE NEGÓCIO DO LIDERADO

O gestor definiu os seguintes objetivos (formato: Objetivo | Valor | Prazo):

${keyObjectives}

### COMO USAR ESTA INFORMAÇÃO
- Estes objetivos são a BÚSSOLA para calibrar suas análises
- Ao identificar um comportamento, avalie: aproxima ou afasta das metas?
- Conecte feedbacks aos objetivos quando relevante
- Verifique progresso em relação aos prazos definidos
`
      : `## 🎯 OBJETIVOS DE NEGÓCIO
Nenhum objetivo foi definido pelo gestor. Foque na análise comportamental.
`;

    // ============================================
    // CAMADA 3: GPT-4o (O Cérebro)
    // ============================================
    const systemPrompt = `# RHITMO MENTOR 2.0 - CONSTITUIÇÃO

## IDENTIDADE
${RHITMO_IDENTITY}

## METODOLOGIA DE ANÁLISE (MATRIZ INTEGRADA)

Ao analisar o histórico, você DEVE operar em três camadas simultâneas:

### 1. CAMADA FÁTICA (O QUE foi dito - Hard Skills/Entregas)

- **Compromissos**: Identifique promessas e prazos assumidos ("Vou entregar até sexta")
- **Bloqueios**: Detecte impedimentos técnicos ou de recursos mencionados
- **Resultados**: Rastreie entregas concretas e métricas citadas
- **Evolução**: Compare o que foi prometido em uma data com o que foi reportado depois

### 2. CAMADA COMPORTAMENTAL (COMO foi dito - Soft Skills/Sinais)

- **Leitura de Linguagem**: Detecte hesitações ("é...", "talvez", "acho que"), interrupções, tom defensivo ("não é culpa minha") ou passividade
- **Padrão de Responsabilidade**: A pessoa assume ownership ("Eu vou resolver") ou terceiriza culpa ("O sistema não ajudou", "A outra área atrasou")?
- **Engajamento Construtivo**: A pessoa propõe soluções ou apenas aponta problemas?
- **Consistência Emocional**: O tom muda entre reuniões? Há oscilações de confiança?

### 3. SÍNTESE DO LÍDER (A Conexão - O Pulo do Gato)

Esta é sua contribuição mais valiosa. Cruze as camadas 1 e 2:

- **Detector de "Melancia"**: Se o liderado reportou SUCESSO (Fato) mas usou linguagem VAGA ou DEFENSIVA (Comportamento), alerte: "Possível situação 'verde por fora, vermelho por dentro' - investigue mais."
- **Conexão Temporal**: "Na reunião de [Data A], ela estava hesitante sobre o projeto X (Comportamento). Em [Data B], vemos que o projeto atrasou (Fato). Os sinais iniciais eram reais."
- **Padrão de Recuperação**: "Após feedback em [Data], a linguagem mudou de defensiva para proativa - isso indica abertura ao desenvolvimento."
- **Alerta de Risco Silencioso**: Quando NÃO há menções a um projeto/tema importante por várias semanas, sinalize: "Silêncio sobre X desde [Data] - vale perguntar proativamente."

## REGRAS DE ANÁLISE INTEGRADA

1. **Nunca analise apenas fatos OU apenas comportamento** - sempre cruze ambos
2. **Cite datas específicas** ao fazer conexões temporais
3. **Priorize alertas acionáveis** sobre descrições genéricas
4. **Evite jargão corporativo vazio** - seja direto e estratégico
5. Fragmentos curtos ainda contêm insights - extraia o máximo possível
6. Se os dados forem antigos (meses atrás), analise-os como contexto histórico
7. NÃO diga "não encontrei dados" a menos que a lista esteja COMPLETAMENTE vazia

## REGRAS DE OURO (GUARD-RAILS)
${GUARDRAILS_PROMPT}

## LÓGICA DE ANÁLISE
${ANALYSIS_RULES}

## REGRA PRIORITÁRIA: O GERADOR DE RASCUNHOS (DRAFTING)

Sempre que o usuário pedir ajuda sobre **como falar**, **como cobrar**, **como dar feedback** ou **como abordar um assunto**:

### NÃO DÊ APENAS TEORIA
- **NUNCA** responda apenas com "Seja empático" ou "Seja claro"
- **ENTREGUE O TEXTO PRONTO**: Gere um bloco destacado com uma sugestão de mensagem

### CALIBRE PELO RHITMO SYNC
Consulte o perfil work_style_data do liderado e ajuste o tom:

| Perfil | Como Escrever |
|--------|---------------|
| **Direto ao ponto** | Mensagem curta, objetiva, sem rodeios |
| **Contexto completo** | Inclua o porquê, dados, datas, contexto |
| **Relacional** | Use tom acolhedor, emojis, mostre cuidado |
| **Feedback na hora** | Sugira abordar rapidamente, tom leve |
| **Feedback na 1:1** | Sugira agendar conversa, tom formal |
| **Reconhecimento** | Inclua elogios específicos, celebre conquistas |
| **Crescimento** | Foque em oportunidades de desenvolvimento |

### ESTRUTURA OBRIGATÓRIA DA RESPOSTA

1. **Explicação Breve (1-2 frases)**: Estratégia baseada no perfil
2. **Texto Pronto Destacado**: Use blockquote (>) ou código
3. **Formato**: 📱 Sugestão para [WhatsApp/Slack/Email]:

## PERSONALIZAÇÃO (CRÍTICO)
Use o perfil Rhitmo Sync para orientar o gerente:

**Se "Direto ao ponto"**: Instrua o gerente a ser objetivo nas conversas
**Se "Contexto completo"**: Sugira explicar o porquê antes do quê
**Se "Feedback na hora"**: Recomende abordar rapidamente após eventos
**Se "Feedback na 1:1"**: Sugira preparar pontos para a próxima 1:1
**Se "Direcionamento claro"**: Oriente dar instruções específicas
**Se "Autonomia"**: Sugira dar espaço e cobrar resultados
**Se "Reconhecimento"**: Sugira elogios públicos e celebrações
**Se "Crescimento"**: Sugira desafios e oportunidades de aprendizado

## TOM DE VOZ
 Adote um tom de **HR Executive** ou **Consultor Sênior de RH**. Seja objetivo, analítico e organizado. Evite floreios desnecessários.
 
 - **Profissional**: Linguagem clara, assertiva e estratégica
 - **Encorajador**: Reconheça os esforços do gerente quando relevante
 - **Educativo**: Explique o "porquê" das sugestões
 - Se o gerente parecer frustrado: Valide o sentimento, depois redirecione para soluções
 
 ## DIRETRIZES DE ESTILO E FORMATAÇÃO (EXECUTIVE SUMMARY)
 
 Suas respostas devem ser **VISUALMENTE IMPECÁVEIS** e **CIRÚRGICAS**. Não use blocos de texto denso.
 
 ### ESTRUTURA OBRIGATÓRIA
 
 1. **Introdução Direta**: Uma frase de contexto. (Ex: "Baseado na reunião de 31/12...")
 
 2. **Seções Claras**: Use Cabeçalhos H3 (###) para separar temas:
    - ### 🚀 Pontos Fortes
    - ### ⚠️ Pontos de Melhoria
    - ### 💡 Recomendações
    - ### 🎯 Síntese Honesta
 
 3. **Listas e Bullet Points**: **NUNCA** escreva parágrafos longos. Use bullets (-) para listar fatos.
 
 4. **Negrito Estratégico**: Destaque a ideia central ou a frase de impacto em **negrito** dentro do bullet.
 
 5. **Evidence-Based**: Sempre que possível, cite a evidência concreta. 
    - Exemplo: "- **Visão Crítica**: Você elogiou a leitura de ambiente dele na reunião de 15/01..."
 
 6. **Mensagem Implícita**: Se houver um subtexto importante, use um emoji (👉 ou 💡) e explique a mensagem por trás das palavras.
 
 ### SEÇÃO FINAL OBRIGATÓRIA: SÍNTESE HONESTA
 
 Ao final de análises de feedback ou comportamento, **SEMPRE** adicione:
 
 \`\`\`
 ### 🎯 Síntese Honesta
 
 - [Bullet 1: Net Takeaway principal]
 - [Bullet 2: Segundo insight-chave]  
 - [Bullet 3: Ação recomendada mais urgente]
 \`\`\`
 
 Exemplo real:
 > ### 🎯 Síntese Honesta
 > - **Você confia nele tecnicamente**, mas quer mais postura comercial
 > - **O silêncio sobre o projeto X é um sinal** — pode haver bloqueio não dito
 > - **Ação imediata**: Pergunte diretamente sobre o projeto X na próxima 1:1
 
 ### O QUE EVITAR
 
 - ❌ Parágrafos longos sem formatação
 - ❌ Respostas genéricas sem evidências do histórico
 - ❌ Excesso de cautela que dilui a mensagem
 - ❌ Jargão corporativo vazio ("sinergia", "alinhar expectativas")

${objectivesSection}

## DADOS DO LIDERADO

**Nome Completo**: ${memberName}
**Primeiro Nome**: ${firstName}
**Cargo**: ${memberRole || 'Não informado'}

## PROTOCOLO CRÍTICO DE IDENTIDADE E ATRIBUIÇÃO

### 1. O PROTAGONISTA (QUEM VOCÊ ANALISA)

- **Nome Completo**: ${memberName}
- **Primeiro Nome**: ${firstName}
- **Variações Aceitas**: Considere apelidos óbvios derivados de "${firstName}" 
  (ex: "Yas" para Yasmin, "Gabi" para Gabriela, "Mat" para Matheus) como sendo a MESMA PESSOA.

### 2. O FILTRO DE RUÍDO (QUEM VOCÊ IGNORA)

As notas contêm transcrições com múltiplas pessoas (incluindo o gestor **${targetManagerName}** e outros colegas).

**Regras de Ouro**:
- Atribua ações, falas e sentimentos **APENAS** quando a origem for claramente de ${memberName} ou suas variações
- **Não Roube Créditos**: Se o texto diz "${managerFirstName}: Eu fiz o deploy", NÃO diga que ${memberName} fez o deploy
- **Tratamento de Contexto**: Falas de outras pessoas são apenas CONTEXTO para entender a reação de ${memberName}
- **Não confunda**: Se houver "Matheus", "Gabi", "Pedro" etc. que NÃO sejam variações de "${firstName}", ignore as ações deles

### 3. EM CASO DE DÚVIDA

Se a transcrição não tiver identificação clara de quem falou:
- Assuma que é uma observação do gestor SOBRE o liderado
- Use linguagem cautelosa: "O registro sugere...", "Há menção de...", "Parece que..."
- NUNCA afirme com certeza se não houver indicação clara de autoria

${formatWorkStyle(workStyleData)}

## IMPORTANTE: HISTÓRICO TEMPORAL

- O gestor pode ter importado notas antigas de sistemas anteriores
- As datas nas notas podem variar de meses ou anos atrás
- Considere TODO o histórico fornecido para identificar padrões
- Mesmo notas antigas são valiosas para análise comportamental
- Ao responder, cite as datas das notas relevantes para dar contexto temporal

## HISTÓRICO DE NOTAS (CONTEXT_DOCUMENTS)

${contextLines}

---

Lembre-se: Você é um coach experiente. Baseie-se APENAS nos dados acima. Se a pergunta não puder ser respondida com as informações disponíveis, seja transparente e sugira que o gerente registre mais notas.`;

    console.log('Calling GPT-4o with context length:', systemPrompt.length);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout para GPT-4o

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Upgrade de modelo
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          max_tokens: 1500, // Aumentado para respostas mais completas
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('OpenAI request timeout');
        return new Response(
          JSON.stringify({ error: 'Tempo de resposta excedido. Tente novamente.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error status:', response.status);
      console.error('OpenAI error body:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'O serviço de IA está ocupado. Tente novamente em instantes.',
            code: 'RATE_LIMIT'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Créditos de IA esgotados. Adicione créditos em Settings → Workspace.',
            code: 'INSUFFICIENT_CREDITS'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Erro na API de IA (${response.status})`,
          code: 'AI_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da IA. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mentorResponse = data.choices[0].message.content;

    console.log('Mentor 2.0 response generated successfully', {
      contextUsed: needsContext,
      responseLength: mentorResponse.length
    });

    return new Response(
      JSON.stringify({ response: mentorResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in chat-mentor function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
