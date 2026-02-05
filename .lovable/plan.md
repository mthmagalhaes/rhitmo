

## Plano: Correção de Identidade em Avaliações (Multi-Speaker Fix)

### Problema

Em transcrições de reuniões com múltiplos participantes, a IA está confundindo os falantes e atribuindo ações/falas de outros (como o gestor Matheus) ao avaliado (ex: Yasmin). Isso ocorre porque o prompt atual não tem instruções explícitas de isolamento de entidade.

---

### Análise do Problema

| Situação | Comportamento Atual | Comportamento Esperado |
|----------|---------------------|------------------------|
| Transcrição: "Matheus entregou o projeto" | IA coloca nos Pontos Fortes de Yasmin | IA ignora (não é ação de Yasmin) |
| Múltiplos participantes na reunião | IA mistura falas de todos | IA filtra apenas falas de Yasmin |
| Dicas de Apresentação | "Matheus demonstra preferência..." | "Sugira como Matheus deve falar com Yasmin..." |

---

### Parte 1: Atualizar Frontend (NewReviewDialog.tsx)

Passar o nome do gestor logado para a Edge Function:

```typescript
// Antes de chamar a função, obter nome do usuário
const { data: { user } } = await supabase.auth.getUser();
const managerName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Gestor';

const fetchPromise = supabase.functions.invoke('generate-review', {
  body: { 
    memberId, 
    memberName,         // Nome do avaliado (já existe)
    managerName,        // NOVO: Nome do gestor
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString()
  }
});
```

---

### Parte 2: Reescrever System Prompt (generate-review/index.ts)

#### 2.1 Receber novo parâmetro

```typescript
const { memberId, memberName, managerName, months, startDate, endDate } = await req.json();

// Fallback se não vier do frontend
const targetMemberName = memberName || member.name;
const targetManagerName = managerName || 'o gestor';
```

#### 2.2 Novo System Prompt com Diretrizes de Atribuição

O prompt será completamente reescrito para incluir regras explícitas de isolamento de entidade:

```text
# RHITMO REVIEW GENERATOR

## IDENTIDADE
[Mantém RHITMO_IDENTITY existente]

## REGRAS DE OURO (PROTOCOLOS DE FILTRAGEM)
[Mantém GUARDRAILS_PROMPT existente]

## 🎯 DIRETRIZES CRÍTICAS DE ATRIBUIÇÃO E ISOLAMENTO

VOCÊ É UM AVALIADOR DE DESEMPENHO FOCADO **ESTRITAMENTE** EM: **${targetMemberName}**
O GESTOR QUE SOLICITOU A AVALIAÇÃO É: **${targetManagerName}**

### CONTEXTO CRÍTICO SOBRE OS DADOS
As notas fornecidas podem conter transcrições de reuniões com **MÚLTIPLOS PARTICIPANTES**.

### PROTOCOLOS DE FILTRAGEM OBRIGATÓRIOS

1. **QUEM É O ALVO**: 
   Você deve analisar **APENAS** as falas, ações e entregas de **${targetMemberName}**.

2. **IGNORE OS OUTROS**: 
   Se ${targetManagerName}, "Giovanna", "Gabi", "Matheus" ou qualquer outra pessoa 
   falou ou fez algo, isso é apenas **CONTEXTO**. 
   NÃO atribua méritos ou defeitos de outros a ${targetMemberName}.

3. **DESAMBIGUAÇÃO DE NOMES**: 
   Se o texto diz "Matheus entregou o projeto" e ${targetMemberName} não é Matheus, 
   NÃO coloque isso nos Pontos Fortes de ${targetMemberName}.
   Se houver dúvida sobre quem realizou a ação, IGNORE o item.

4. **ANÁLISE DE SILÊNCIO**: 
   Se ${targetMemberName} estava na reunião mas não falou nada ou não teve ações 
   registradas, note isso como comportamento observável (passividade/escuta ativa), 
   mas NUNCA invente ações.

5. **DADOS INSUFICIENTES**: 
   Se não houver registros suficientes especificamente sobre ${targetMemberName}, 
   diga claramente: "Não há registros suficientes da atuação direta de ${targetMemberName} 
   nas notas fornecidas para avaliar este aspecto."

## MISSÃO ESPECÍFICA: GERAR AVALIAÇÃO DE DESEMPENHO

Gerar um RASCUNHO de Avaliação de Desempenho profissional com base APENAS 
nas notas fornecidas ${periodDescription}.

[... resto do formato de saída mantido ...]

## 🎭 Como Apresentar Esta Avaliação
*Baseado no perfil Rhitmo Sync de ${targetMemberName}:*

Sugira como **${targetManagerName}** deve conduzir a reunião de feedback com **${targetMemberName}**:
- Se "Direto ao ponto": ${targetManagerName} deve ir direto aos fatos, ser objetivo
- Se "Contexto completo": ${targetManagerName} deve explicar o processo antes dos resultados
- Se preferência por "Reconhecimento": ${targetManagerName} deve começar pelos pontos fortes
- Se preferência por "Crescimento": ${targetManagerName} deve focar nas oportunidades

## REGRAS CRÍTICAS DE VALIDAÇÃO FINAL
- Antes de finalizar, VERIFIQUE se todas as ações citadas são de ${targetMemberName}
- Se mencionar qualquer outro nome, confirme que é apenas contexto, não atribuição
- NUNCA escreva "o gestor demonstra" ou "${targetManagerName} fez X" nos pontos fortes/fracos
- O documento final é SOBRE ${targetMemberName}, não sobre ${targetManagerName}
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/NewReviewDialog.tsx` | Obter nome do usuário logado e passar `memberName` + `managerName` para a Edge Function |
| `supabase/functions/generate-review/index.ts` | Receber `managerName`, reescrever system prompt com diretrizes de atribuição e isolamento de entidade |

---

### Fluxo de Dados

```text
NewReviewDialog
      │
      ├── memberId (já existe)
      ├── memberName (já existe como prop)
      ├── managerName ← user.user_metadata.full_name (NOVO)
      │
      ▼
Edge Function (generate-review)
      │
      ├── targetMemberName = memberName || member.name
      ├── targetManagerName = managerName || 'o gestor'
      │
      ▼
System Prompt interpolado
      │
      ├── "FOCADO ESTRITAMENTE EM: Yasmin"
      ├── "O GESTOR É: Matheus"
      ├── "Se Matheus fez algo, é CONTEXTO, não atribua a Yasmin"
      │
      ▼
IA gera avaliação filtrada
```

---

### Seção Técnica

**Por que essa abordagem funciona?**

1. **Explicit Entity Constraint**: A IA recebe instruções claras sobre QUEM é o alvo da análise
2. **Negative Examples**: O prompt inclui exemplos do que NÃO fazer (ex: "Se Matheus entregou...")
3. **Role Separation**: Distinção clara entre avaliado (memberName) e avaliador (managerName)
4. **Fallback Seguro**: Se não houver dados sobre o membro, a IA é instruída a dizer isso

**Cenários protegidos após a correção:**

| Cenário | Antes | Depois |
|---------|-------|--------|
| "Matheus apresentou bem" (Yasmin é o alvo) | ❌ Colocava em Pontos Fortes de Yasmin | ✅ Ignora (não é Yasmin) |
| Reunião com 5 pessoas | ❌ Misturava falas | ✅ Filtra apenas Yasmin |
| Dicas de Apresentação | ❌ "Matheus demonstra..." | ✅ "Sugira como Matheus deve falar com Yasmin..." |
| Sem dados sobre o membro | ❌ Inventava | ✅ "Não há registros suficientes..." |

