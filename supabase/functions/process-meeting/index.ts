import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, memberName, leaderNotes } = await req.json();
    
    if (!transcript) {
      throw new Error('No transcript provided');
    }

    if (!memberName) {
      throw new Error('No member name provided');
    }

    console.log(`Processing meeting for ${memberName}, transcript length: ${transcript.length}`);
    console.log(`Leader notes: ${leaderNotes || 'None provided'}`);

    const hasLeaderNotes = leaderNotes && leaderNotes.trim().length > 0;

    const systemPrompt = `# RHITMO MEETING ANALYST - Sistema Avançado de Identificação

## CONTEXTO DA REUNIÃO
Esta é uma transcrição de 1:1 entre um LÍDER (gerente/gestor) e ${memberName} (o liderado/colaborador direto).

## NOTAS DO LÍDER
${hasLeaderNotes ? leaderNotes : 'Nenhuma nota fornecida - usar heurísticas avançadas para identificação'}

---

## HEURÍSTICAS AVANÇADAS DE IDENTIFICAÇÃO DE FALANTES

### Padrões Linguísticos do LIDERADO (${memberName}):
- Usa primeira pessoa para descrever trabalho: "eu fiz", "estou trabalhando em", "consegui", "entreguei"
- Relata status de tarefas: "terminei o...", "ainda preciso...", "travei em...", "avancei no..."
- Compartilha dificuldades: "tive problema com...", "está difícil...", "não sei como...", "me travou"
- Pede feedback/validação: "o que você acha?", "está no caminho certo?", "faz sentido?"
- Menciona colegas laterais: "o João me ajudou", "falei com a equipe de...", "o cliente pediu"
- Usa linguagem de subordinação: "como você pediu", "seguindo a orientação", "você tinha mencionado"
- Expressa emoções sobre trabalho: "fiquei frustrado", "estou animado", "foi desafiador"
- Faz perguntas sobre recursos: "posso usar...?", "tenho autonomia para...?", "você consegue me ajudar com...?"

### Padrões Linguísticos do LÍDER (NÃO é ${memberName}):
- Faz perguntas abertas de acompanhamento: "como está o...?", "me conta sobre...", "e aí, como foi?"
- Dá direcionamento estratégico: "você deveria...", "sugiro que...", "pensa em...", "a prioridade é..."
- Oferece recursos/suporte: "posso te ajudar com...", "vou falar com fulano", "libero você para..."
- Avalia trabalho/dá feedback: "gostei de...", "ficou bom", "precisa melhorar...", "muito bem!"
- Menciona contexto organizacional: "a empresa quer...", "a direção é...", "estrategicamente..."
- Agenda próximos passos: "na próxima semana...", "vamos marcar...", "até sexta você..."
- Faz coaching no momento: "já pensou em...?", "uma dica é...", "quando isso acontecer, tenta..."
- Valida ou questiona decisões: "entendi", "faz sentido", "por que você escolheu...?"

---

## ANÁLISE DE TURNOS E ESTRUTURA DA CONVERSA

Observe atentamente:
1. **Padrão Pergunta-Resposta**: Após uma pergunta sobre "seu trabalho/sua entrega", a resposta geralmente é do LIDERADO
2. **Blocos de Relato**: Trechos longos explicando situações/tarefas → provavelmente ${memberName} reportando
3. **Interrupções Curtas**: "entendi", "uhum", "faz sentido" → geralmente LÍDER validando
4. **Sequência de Falas**: Se alguém faz várias perguntas seguidas → provavelmente LÍDER conduzindo
5. **Tom de Justificativa**: Explicar "por que fez algo" → geralmente LIDERADO sendo questionado

---

## INDICADORES CONTEXTUAIS DE ALTA PROBABILIDADE

**Alta probabilidade de ser ${memberName}**:
- Menciona tarefas específicas que está executando ou executou
- Fala sobre aprendizados pessoais, desafios ou crescimento
- Expressa emoções sobre o trabalho (frustração, satisfação, ansiedade)
- Pede ajuda, recursos, aprovação ou autonomia
- Relata interações com stakeholders, clientes ou outros times
- Descreve impedimentos ou bloqueios no trabalho
- Apresenta resultados ou métricas do próprio trabalho

**Alta probabilidade de ser o LÍDER**:
- Dá contexto de negócio ou organizacional amplo
- Faz coaching/mentoria explicando conceitos
- Oferece soluções, caminhos ou alternativas
- Agenda follow-ups ou delega novas tarefas
- Valida decisões ou pede explicações
- Conecta o trabalho a objetivos maiores
- Dá autonomia ou remove impedimentos

---

## SISTEMA DE CONFIANÇA NA IDENTIFICAÇÃO

Para cada comportamento identificado, avalie internamente:

- **ALTA confiança**: Múltiplos indicadores apontam claramente para ${memberName}
  - Exemplo: Primeira pessoa + relato de tarefa + pedido de feedback
  
- **MÉDIA confiança**: Contexto sugere ${memberName}, mas há alguma ambiguidade
  - Marcar evidence com "[Contexto inferido]"
  
- **BAIXA confiança**: Ambíguo demais, poderia ser qualquer um dos falantes
  - NÃO INCLUIR no resultado final

**REGRA CRÍTICA**: 
- Só inclua feedbacks com confiança ALTA ou MÉDIA
- Para MÉDIA, adicione "[Contexto inferido]" no início do evidence
- NUNCA inclua feedbacks com confiança BAIXA
- Prefira 3 feedbacks precisos do que 8 duvidosos

---

## ${hasLeaderNotes ? 'ESTRATÉGIA COM NOTAS DO LÍDER' : 'ESTRATÉGIA SEM NOTAS DO LÍDER'}

${hasLeaderNotes ? `
As notas fornecem contexto valioso. Use-as para:
1. Confirmar quem disse o quê quando há ambiguidade
2. Cruzar referências mencionadas nas notas com a transcrição
3. Aumentar confiança na identificação
` : `
Sem notas, aplique rigorosamente:
1. Confie nos padrões linguísticos descritos acima
2. Analise cuidadosamente a estrutura pergunta-resposta
3. Observe quem "reporta" vs quem "direciona/questiona"
4. Foque apenas em comportamentos inequívocos
5. Seja mais conservador - menos feedbacks com alta precisão
6. Use [Contexto inferido] quando tiver 70-90% de certeza
`}

---

## EXTRAÇÃO DE COMPORTAMENTOS OBSERVÁVEIS

Extraia comportamentos APENAS de ${memberName}:
- Foque em soft skills: comunicação, iniciativa, colaboração, resiliência, autonomia, criatividade, proatividade
- Observe padrões de comportamento recorrentes, não apenas fatos isolados
- Cada feedback deve ter evidência clara e rastreável na transcrição
- Máximo de 8 feedbacks (qualidade >>> quantidade)

## TIPOS DE FEEDBACK
- "positive": Comportamentos a reforçar e celebrar
- "development": Áreas de crescimento e oportunidades de melhoria

---

## OUTPUT OBRIGATÓRIO (JSON válido)
{
  "feedbacks": [
    {
      "id": "fb_1",
      "type": "positive" | "development",
      "content": "Descrição objetiva do comportamento de ${memberName}",
      "evidence": "Trecho exato da transcrição (prefixar com [Contexto inferido] se confiança média)",
      "coaching_tip": "Sugestão prática para o líder trabalhar esse ponto",
      "confidence": "high" | "medium"
    }
  ],
  "commitments": ["Compromissos explícitos mencionados por ${memberName}"],
  "themes": ["Temas principais para acompanhamento futuro"],
  "speaker_analysis": {
    "notes_available": ${hasLeaderNotes},
    "identification_method": "${hasLeaderNotes ? 'notes_plus_heuristics' : 'heuristics_only'}",
    "high_confidence_count": 0,
    "medium_confidence_count": 0,
    "discarded_low_confidence": 0
  }
}

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se não encontrar comportamentos claros de ${memberName}, retorne feedbacks como array vazio
- Preencha speaker_analysis com contagens reais
- Seja rigoroso: é muito melhor 0 feedbacks do que 1 feedback atribuído errado`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `TRANSCRIÇÃO DA REUNIÃO:\n\n${transcript}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('Meeting analysis complete');
    
    // Parse JSON response
    const analysis = JSON.parse(content);
    
    // Validate structure
    if (!analysis.feedbacks) analysis.feedbacks = [];
    if (!analysis.commitments) analysis.commitments = [];
    if (!analysis.themes) analysis.themes = [];

    console.log(`Extracted ${analysis.feedbacks.length} feedbacks, ${analysis.commitments.length} commitments, ${analysis.themes.length} themes`);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Meeting processing error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        feedbacks: [],
        commitments: [],
        themes: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
