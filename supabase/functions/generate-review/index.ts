import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RHITMO_IDENTITY, GUARDRAILS_PROMPT } from "../_shared/rhitmo-constitution.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberId, memberName, managerName, months, startDate, endDate } = await req.json();

    if (!memberId) {
      return new Response(
        JSON.stringify({ error: 'memberId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!months && (!startDate || !endDate)) {
      return new Response(
        JSON.stringify({ error: 'Informe months ou (startDate + endDate)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calcular datas limite (suporta custom range ou months)
    let limitDate: Date;
    let endLimitDate: Date;

    if (startDate && endDate) {
      // Modo Custom Range
      limitDate = new Date(startDate);
      endLimitDate = new Date(endDate);
      console.log(`Período personalizado: ${limitDate.toISOString()} a ${endLimitDate.toISOString()}`);
    } else {
      // Modo Legacy (presets em meses)
      limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - months);
      endLimitDate = new Date();
      console.log(`Gerando avaliação para member ${memberId} dos últimos ${months} meses`);
    }

    console.log(`Data início: ${limitDate.toISOString()}`);
    console.log(`Data fim: ${endLimitDate.toISOString()}`);

    // Buscar feedbacks do período (usar occurred_at - "Máquina do Tempo")
    const { data: feedbacks, error: feedbacksError } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('member_id', memberId)
      .gte('occurred_at', limitDate.toISOString())
      .lte('occurred_at', endLimitDate.toISOString())
      .order('occurred_at', { ascending: true });

    if (feedbacksError) {
      console.error('Erro ao buscar feedbacks:', feedbacksError);
      throw feedbacksError;
    }

    console.log(`Encontrados ${feedbacks?.length || 0} feedbacks no período`);

    // Buscar dados do membro (incluindo work_style_data)
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError) {
      console.error('Erro ao buscar membro:', memberError);
      throw memberError;
    }

    console.log(`Membro encontrado: ${member.name}`);

    // Nomes para isolamento de entidade
    const targetMemberName = memberName || member.name;
    const targetManagerName = managerName || 'o gestor';
    
    // Extrair primeiro nome para flexibilidade de apelidos
    const firstName = targetMemberName.split(' ')[0];
    const managerFirstName = targetManagerName.split(' ')[0];

    const keyObjectives = member.key_objectives;

    // Preparar contexto para a IA
    const feedbacksText = feedbacks && feedbacks.length > 0
      ? feedbacks.map(f => {
          const date = new Date(f.occurred_at || f.created_at).toLocaleDateString('pt-BR');
          return `[${date}] Tipo: ${f.type}\n${f.content}\n${f.summary ? `Resumo IA: ${f.summary}` : ''}`;
        }).join('\n\n---\n\n')
      : 'Nenhum feedback registrado neste período.';

    const workStyleInfo = member.work_style_data 
      ? `\n\nPERFIL RHITMO SYNC:\n${JSON.stringify(member.work_style_data, null, 2)}`
      : '\n\nPerfil Rhitmo Sync não disponível.';

    // System Prompt
    // Descrição do período para o prompt
    const periodDescription = startDate && endDate
      ? `de ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
      : `dos últimos ${months} meses`;

    const systemPrompt = `# RHITMO REVIEW GENERATOR - AVALIAÇÃO DE ${targetMemberName.toUpperCase()}

## IDENTIDADE
${RHITMO_IDENTITY}

## REGRAS DE OURO
${GUARDRAILS_PROMPT}

## 🎯 DIRETRIZES CRÍTICAS DE ATRIBUIÇÃO E ISOLAMENTO

VOCÊ É UM AVALIADOR DE DESEMPENHO FOCADO **ESTRITAMENTE** EM: **${targetMemberName}**
O GESTOR QUE SOLICITOU A AVALIAÇÃO É: **${targetManagerName}**

### CONTEXTO CRÍTICO SOBRE OS DADOS
As notas fornecidas podem conter transcrições de reuniões com **MÚLTIPLOS PARTICIPANTES**.
Isso significa que falas de outras pessoas (incluindo ${targetManagerName}) podem aparecer.

### PROTOCOLOS DE FILTRAGEM OBRIGATÓRIOS

### PROTOCOLO DE FLEXIBILIDADE DE NOMES

O MEMBRO AVALIADO É: **${targetMemberName}** (Primeiro Nome: **${firstName}**)

Nas transcrições, este membro pode ser citado como:
- **Nome Completo**: "${targetMemberName}"
- **Primeiro Nome**: "${firstName}"
- **Apelidos/Diminutivos Comuns**: Variações óbvias do primeiro nome (ex: se for "Yasmin", aceite "Yas", "Yasmim"; se for "Gabriela", aceite "Gabi", "Gabs"; se for "Matheus", aceite "Mat", "Theus")

**AÇÃO**: Considere todas essas variações como sendo a MESMA PESSOA. 
Se o texto diz "Yas: terminei a tarefa" e ${firstName} é Yasmin, atribua essa ação a ${targetMemberName}.
Se o texto diz "${firstName}: vou entregar amanhã", atribua a ${targetMemberName}.

**ATENÇÃO**: NÃO confunda variações do nome do gestor (${targetManagerName}/${managerFirstName}) com variações de ${targetMemberName}.

### PROTOCOLOS DE FILTRAGEM

1. **QUEM É O ALVO**: 
   Você deve analisar **APENAS** as falas, ações e entregas de **${targetMemberName}**.
   Lembre-se: "${firstName}" e apelidos comuns (ex: truncamentos, diminutivos) também são ${targetMemberName}.

2. **IGNORE OS OUTROS**: 
   Se ${targetManagerName}, "Giovanna", "Gabi", "Matheus", "Pedro", "Ana" ou qualquer outra pessoa 
   falou ou fez algo, isso é apenas **CONTEXTO**. 
   NÃO atribua méritos ou defeitos de outros a ${targetMemberName}.
   EXCETO se o apelido/diminutivo for claramente uma variação de "${firstName}".

3. **DESAMBIGUAÇÃO DE NOMES**: 
   Se o texto diz "Matheus entregou o projeto" e ${targetMemberName} não é Matheus, 
   NÃO coloque isso nos Pontos Fortes de ${targetMemberName}.
   Se houver dúvida sobre quem realizou a ação, IGNORE o item completamente.

4. **ANÁLISE DE SILÊNCIO**: 
   Se ${targetMemberName} estava na reunião mas não falou nada ou não teve ações 
   registradas, note isso como comportamento observável (passividade/escuta ativa), 
   mas NUNCA invente ações.

5. **DADOS INSUFICIENTES**: 
   Se não houver registros suficientes especificamente sobre ${targetMemberName}, 
   diga claramente: "Não há registros suficientes da atuação direta de ${targetMemberName} 
   nas notas fornecidas para avaliar este aspecto."

## MISSÃO ESPECÍFICA: GERAR AVALIAÇÃO DE DESEMPENHO

Gerar um RASCUNHO de Avaliação de Desempenho profissional para **${targetMemberName}** com base APENAS 
nas notas fornecidas ${periodDescription}.

## FORMATO DE SAÍDA: MARKDOWN PURO

### RESTRIÇÕES CRÍTICAS DE FORMATAÇÃO
- **NUNCA** use blocos de código (\`\`\`)
- **NUNCA** use tags HTML (<h2>, <p>, <ul>, <li>, <strong>, etc.)
- **NUNCA** inclua o nome do liderado ou data no início (o sistema já mostra isso)
- Use APENAS sintaxe Markdown padrão:
  - ## para títulos de seção
  - ### para subtítulos
  - **texto** para negrito
  - *texto* para itálico
  - - item para listas não ordenadas
  - 1. item para listas ordenadas

## ESTRUTURA OBRIGATÓRIA

## 📊 Resumo Executivo
Visão geral do período avaliado de **${targetMemberName}** (2-3 frases).

## 💪 Pontos Fortes
- **Ponto 1:** Descrição com evidência (ref: data)
- **Ponto 2:** Descrição com evidência (ref: data)

Liste 3-5 pontos fortes identificados **EXCLUSIVAMENTE** de ${targetMemberName}.
SEMPRE inclua evidências com datas: "Demonstrou liderança no projeto X (ref: 15/Out)"
Se não houver dados suficientes sobre ${targetMemberName}, seja transparente.

## 🎯 Oportunidades de Melhoria
- **Área 1:** Descrição construtiva
- **Área 2:** Descrição construtiva

Liste 2-4 pontos de desenvolvimento.
Use tom construtivo, não punitivo.
Inclua evidências quando disponíveis.

## 🚀 Sugestão de PDI
1. **Ação 1:** Descrição concreta e mensurável (Prazo: X meses)
2. **Ação 2:** Descrição concreta e mensurável (Prazo: X meses)

2-3 ações concretas e mensuráveis com prazos sugeridos.

## 🎭 Como Apresentar Esta Avaliação
*Baseado no perfil Rhitmo Sync de ${targetMemberName}:*

Sugira como **${targetManagerName}** deve conduzir a reunião de feedback com **${targetMemberName}**:
- Se ${targetMemberName} prefere "Direto ao ponto": ${targetManagerName} deve ir direto aos fatos, ser objetivo
- Se ${targetMemberName} prefere "Contexto completo": ${targetManagerName} deve explicar o processo antes dos resultados
- Se ${targetMemberName} tem preferência por "Reconhecimento": ${targetManagerName} deve começar pelos pontos fortes
- Se ${targetMemberName} tem preferência por "Crescimento": ${targetManagerName} deve focar nas oportunidades

## REGRAS CRÍTICAS DE VALIDAÇÃO FINAL
- Antes de finalizar, VERIFIQUE se todas as ações citadas são de ${targetMemberName}
- Se mencionar qualquer outro nome, confirme que é apenas contexto, não atribuição
- NUNCA escreva "o gestor demonstra" ou "${targetManagerName} fez X" nos pontos fortes/fracos
- O documento final é SOBRE ${targetMemberName}, não sobre ${targetManagerName}
- NUNCA invente informações que não estão nos feedbacks
- Se não houver dados suficientes sobre ${targetMemberName}, diga claramente
- Mantenha tom profissional, respeitoso e construtivo
- Use APENAS sintaxe Markdown padrão
- Sempre cite datas quando mencionar eventos específicos`;

    // Seção de Objetivos (condicional)
    const objectivesSection = keyObjectives && keyObjectives.trim()
      ? `

## 🎯 OBJETIVOS DO PERÍODO (definidos pelo gestor)

${keyObjectives}

### COMO AVALIAR EM RELAÇÃO AOS OBJETIVOS
- **Resumo Executivo**: Mencione progresso geral em relação às metas
- **Pontos Fortes**: Destaque entregas e comportamentos alinhados aos objetivos
- **Oportunidades**: Aponte gaps entre desempenho atual e metas
- **PDI**: Sugira ações que aproximem o liderado dos objetivos e prazos
- Considere os prazos definidos ao avaliar urgência
`
      : `

## 🎯 OBJETIVOS DO PERÍODO
Nenhum objetivo formal foi definido.

### COMPORTAMENTO ESPERADO
- Foque na análise comportamental e de competências
- NÃO invente metas ou suposições de negócio
- Base a avaliação exclusivamente nos feedbacks
`;

    const userPrompt = `FEEDBACKS ${periodDescription.toUpperCase()}:\n\n${feedbacksText}${workStyleInfo}${objectivesSection}\n\nGere a avaliação de desempenho seguindo EXATAMENTE a estrutura indicada.

IMPORTANTE: Separe o documento principal das dicas de apresentação usando o delimitador ---COACHING_TIP--- 
A seção "## 🎭 Como Apresentar Esta Avaliação" deve vir DEPOIS do delimitador.`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Chamando Lovable AI...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Lovable AI request timeout');
        return new Response(
          JSON.stringify({ 
            error: 'O serviço de IA está demorando muito. Tente novamente em instantes.',
            code: 'TIMEOUT'
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }
    
    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro da Lovable AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos em Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Erro na Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      console.error('Resposta da IA sem conteúdo:', aiData);
      throw new Error('IA não retornou conteúdo');
    }

    // Separar conteúdo principal das dicas de coaching
    const parts = generatedContent.split('---COACHING_TIP---');
    const reviewContent = parts[0]?.trim() || generatedContent;
    const coachingTip = parts[1]?.trim() || null;

    console.log('Avaliação gerada com sucesso');
    console.log('Coaching tip presente:', !!coachingTip);

    return new Response(
      JSON.stringify({ 
        review_content: reviewContent,
        coaching_tip: coachingTip,
        feedbackCount: feedbacks?.length || 0,
        memberName: member.name,
        periodStart: limitDate.toISOString(),
        periodEnd: endLimitDate.toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro em generate-review:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});