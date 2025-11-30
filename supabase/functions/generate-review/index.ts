import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberId, months } = await req.json();

    if (!memberId || !months) {
      return new Response(
        JSON.stringify({ error: 'memberId e months são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calcular data limite (Máquina do Tempo)
    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() - months);

    console.log(`Gerando avaliação para member ${memberId} dos últimos ${months} meses`);
    console.log(`Data limite: ${limitDate.toISOString()}`);

    // Buscar feedbacks do período
    const { data: feedbacks, error: feedbacksError } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('member_id', memberId)
      .gte('created_at', limitDate.toISOString())
      .order('created_at', { ascending: true });

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

    // Preparar contexto para a IA
    const feedbacksText = feedbacks && feedbacks.length > 0
      ? feedbacks.map(f => {
          const date = new Date(f.created_at).toLocaleDateString('pt-BR');
          return `[${date}] Tipo: ${f.type}\n${f.content}\n${f.summary ? `Resumo IA: ${f.summary}` : ''}`;
        }).join('\n\n---\n\n')
      : 'Nenhum feedback registrado neste período.';

    const workStyleInfo = member.work_style_data 
      ? `\n\nPERFIL RHITMO SYNC:\n${JSON.stringify(member.work_style_data, null, 2)}`
      : '\n\nPerfil Rhitmo Sync não disponível.';

    // System Prompt
    const systemPrompt = `# RHITMO REVIEW GENERATOR

## SUA MISSÃO
Gerar um RASCUNHO de Avaliação de Desempenho profissional com base APENAS 
nas notas fornecidas dos últimos ${months} meses.

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
Visão geral do período avaliado (2-3 frases).

## 💪 Pontos Fortes
- **Ponto 1:** Descrição com evidência (ref: data)
- **Ponto 2:** Descrição com evidência (ref: data)

Liste 3-5 pontos fortes identificados.
SEMPRE inclua evidências com datas: "Demonstrou liderança no projeto X (ref: 15/Out)"
Se não houver dados suficientes, seja transparente.

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
*Baseado no perfil Rhitmo Sync:*

Use o perfil work_style_data para sugerir COMO apresentar:
- Se "Direto ao ponto": Vá direto aos fatos, seja objetivo
- Se "Contexto completo": Explique o processo antes dos resultados
- Se preferência por "Reconhecimento": Comece pelos pontos fortes
- Se preferência por "Crescimento": Foque nas oportunidades

## REGRAS CRÍTICAS
- NUNCA invente informações que não estão nos feedbacks
- Se não houver dados suficientes, diga claramente: "Dados insuficientes para avaliar este aspecto"
- Mantenha tom profissional, respeitoso e construtivo
- Use APENAS sintaxe Markdown padrão
- Sempre cite datas quando mencionar eventos específicos`;

    const userPrompt = `FEEDBACKS DOS ÚLTIMOS ${months} MESES:\n\n${feedbacksText}${workStyleInfo}\n\nGere a avaliação de desempenho seguindo EXATAMENTE a estrutura indicada.

IMPORTANTE: Separe o documento principal das dicas de apresentação usando o delimitador ---COACHING_TIP--- 
A seção "## 🎭 Como Apresentar Esta Avaliação" deve vir DEPOIS do delimitador.`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Chamando Lovable AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
    });

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
        memberName: member.name
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