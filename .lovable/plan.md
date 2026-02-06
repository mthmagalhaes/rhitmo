

## Plano: Implementar Inteligencia de Carreira (Gap Analysis)

Este plano implementa uma camada de IA que analisa os dados do Job Crafting coletados no onboarding e gera insights de carreira instantaneos para o colaborador.

---

## Visao Geral da Arquitetura

```text
+-------------------+      +------------------------+      +--------------------+
|   Onboarding.tsx  | ---> | analyze-job-crafting   | ---> |  skills_data com   |
|   (Passo Final)   |      | (Edge Function)        |      |  ai_analysis       |
+-------------------+      +------------------------+      +--------------------+
                                    |
                                    v
                           +------------------------+
                           | DirectReportDashboard  |
                           | + CareerCompassCard    |
                           +------------------------+
```

---

## Parte 1: Nova Edge Function - analyze-job-crafting

### Arquivo
`supabase/functions/analyze-job-crafting/index.ts`

### Input Esperado
```json
{
  "role": "Analista de Marketing",
  "responsibilities": [
    "Gerenciar campanhas de midia paga",
    "Produzir relatorios semanais",
    "Coordenar briefings com equipe criativa"
  ],
  "aspirations": "Quero melhorar analise de dados e apresentacao executiva",
  "interests": ["analytics", "communication"]
}
```

### Logica da IA
- Modelo: `google/gemini-2.5-flash` (via Lovable AI Gateway)
- Persona: Senior Career Coach
- Prompt inclui:
  - Analise de alinhamento cargo vs responsabilidades
  - Deteccao de desvios de funcao
  - Cruzamento com aspiracoes para sugerir focos

### Output JSON Estruturado (via Tool Calling)
```json
{
  "alignment_score": 78,
  "analysis_summary": "Suas responsabilidades mostram forte foco operacional. Para alcancar suas aspiracoes de analise de dados, considere buscar projetos com metricas quantitativas.",
  "key_gaps": [
    "Pouca exposicao a dashboards e BI",
    "Responsabilidades focam em execucao, nao estrategia",
    "Ausencia de apresentacoes para stakeholders"
  ],
  "suggested_focus": [
    "Participar de projetos de analytics por 2h/semana",
    "Solicitar mentorias com time de dados",
    "Apresentar resultados de campanhas em reunioes de equipe"
  ]
}
```

### Tratamento de Erros
- Timeout: 30s com fallback gracioso
- Rate limit (429): Mensagem amigavel
- Credits (402): Orientacao para adicionar creditos

---

## Parte 2: Integracao no Onboarding.tsx

### Mudancas no handleSubmit

1. **Novo Estado de Loading Especial**
   - Adicionar estado `analyzingWithAI` (boolean)
   - Exibir tela especial: "A IA esta analisando seu perfil profissional..."
   - Mostrar animacao de loading com icone de robo

2. **Fluxo Atualizado**
   ```text
   Clica "Finalizar"
        |
        v
   Salva skills_data inicial (sem ai_analysis)
        |
        v
   Exibe loading "IA analisando..."
        |
        v
   Chama analyze-job-crafting
        |
        +-- Sucesso: Atualiza skills_data com ai_analysis
        |
        +-- Falha: Log + continua sem analise (nao bloqueia)
        |
        v
   Redireciona para /dashboard
   ```

3. **Estrutura Final do skills_data**
   ```json
   {
     "role_tenure": "1_to_3",
     "responsibilities": ["...", "...", "..."],
     "aspirations": "...",
     "interests": ["leadership", "analytics"],
     "onboarding_completed": true,
     "completed_at": "2024-...",
     "ai_analysis": {
       "alignment_score": 78,
       "analysis_summary": "...",
       "key_gaps": ["...", "...", "..."],
       "suggested_focus": ["...", "...", "..."],
       "analyzed_at": "2024-..."
     }
   }
   ```

---

## Parte 3: Novo Componente - CareerCompassCard

### Arquivo
`src/components/dashboard/CareerCompassCard.tsx`

### Visual Proposto

```text
+--------------------------------------------------+
|  Bussola de Carreira                        [AI] |
+--------------------------------------------------+
|                                                  |
|  Alinhamento com a Funcao                        |
|  [=============================-----]  78%       |
|                                                  |
|  "Suas responsabilidades mostram forte foco      |
|  operacional. Para alcancar suas aspiracoes..."  |
|                                                  |
+--------------------------------------------------+
|  Pontos de Atencao     |  Foco Recomendado       |
|  - Pouca exposicao...  |  - Participar de...     |
|  - Responsabilidades...|  - Solicitar mentorias..|
|  - Ausencia de...      |  - Apresentar result... |
+--------------------------------------------------+
```

### Props
```typescript
interface CareerCompassCardProps {
  aiAnalysis: {
    alignment_score: number;
    analysis_summary: string;
    key_gaps: string[];
    suggested_focus: string[];
    analyzed_at?: string;
  };
}
```

### Comportamento
- Se `ai_analysis` nao existe: Card nao renderiza (ou mostra estado vazio)
- Barra de progresso com cores dinamicas:
  - Verde (80-100): Excelente alinhamento
  - Amarelo (50-79): Alinhamento moderado
  - Vermelho (0-49): Oportunidade de realinhamento

---

## Parte 4: Atualizacao do DirectReportDashboard

### Mudancas

1. **Atualizar Interface LinkedMemberData**
   Adicionar tipagem para `ai_analysis` dentro de `skills_data`

2. **Layout Atualizado**
   ```text
   +--------------------------------------------+
   |              Header                        |
   +--------------------------------------------+
   |                                            |
   | [CareerCompassCard - DESTAQUE]             | <- Novo
   |                                            |
   +--------------------------------------------+
   | [Meu Perfil]    |   [Minhas Anotacoes]     |
   +--------------------------------------------+
   ```

3. **Condicional de Renderizacao**
   - Mostrar CareerCompassCard apenas se `skills_data.ai_analysis` existe

---

## Parte 5: Atualizacao do config.toml

Adicionar configuracao da nova funcao:

```toml
[functions.analyze-job-crafting]
verify_jwt = true
```

---

## Resumo de Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/analyze-job-crafting/index.ts` | Criar | Edge function de analise com Lovable AI |
| `supabase/config.toml` | Modificar | Adicionar config da nova funcao |
| `src/pages/Onboarding.tsx` | Modificar | Adicionar chamada a IA no handleSubmit |
| `src/components/dashboard/CareerCompassCard.tsx` | Criar | Componente visual do mapa de carreira |
| `src/components/dashboard/DirectReportDashboard.tsx` | Modificar | Integrar CareerCompassCard |

---

## Secao Tecnica

### Edge Function - Estrutura do Prompt

O prompt seguira a Constituicao Rhitmo existente (`rhitmo-constitution.ts`) e incluira:

1. **Persona**: Senior Career Coach especializado em desenvolvimento profissional
2. **Guardrails**: 
   - Nao dar conselhos de demissao ou mudanca de empresa
   - Tom motivador e construtivo
   - Baseado em dados de mercado genericos (nao alucinacao)
3. **Tool Calling**: Forcara output JSON estruturado

### Tratamento de Erros no Frontend

- A chamada a IA e **non-blocking**: se falhar, o onboarding conclui normalmente
- O usuario pode ver o dashboard mesmo sem `ai_analysis`
- Log de erros para debugging
- Toast informativo em caso de falha da IA

### Performance

- Chamada paralela: salvar dados basicos primeiro, depois chamar IA
- Timeout de 30s para nao travar UX
- Cache: `ai_analysis` e persistido no banco, nao recalculado a cada acesso

