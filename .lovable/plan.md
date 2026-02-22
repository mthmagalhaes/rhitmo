

## Integrar leader_sync_data ao Mentor Chat

### Resumo

Passar o perfil de lideranca do gestor (`leader_sync_data`) como contexto adicional para a Edge Function `chat-mentor`, permitindo que o Mentor calibre sugestoes pelo estilo do proprio lider.

### Arquivos Modificados

**1. `src/pages/MemberDetails.tsx`**

Na query de workspace (~linha 159), adicionar `leader_sync_data` ao select:

```text
// Antes:
.select('id')

// Depois:
.select('id, leader_sync_data')
```

Na renderizacao do MentorChat (~linha 652), passar a nova prop:

```text
<MentorChat ... leaderSyncData={workspace?.leader_sync_data} />
```

**2. `src/components/MentorChat.tsx`**

- Adicionar `leaderSyncData?: any` na interface `MentorChatProps`
- Na chamada fetch ao `chat-mentor`, incluir `leaderSyncData` no body JSON

**3. `supabase/functions/chat-mentor/index.ts`**

- Extrair `leaderSyncData` do request body (junto com os outros campos, ~linha 136)
- Criar helper `formatLeaderProfile(data)` que retorna uma string formatada com todos os campos do perfil, ou uma linha discreta se null
- Injetar a secao formatada no system prompt, entre o perfil do liderado e o historico de notas

### Detalhes Tecnicos

**Helper `formatLeaderProfile`:**

```text
const formatLeaderProfile = (data: any): string => {
  if (!data) return 'Perfil de lideranca do gestor: nao preenchido ainda.';

  const tenureLabels: any = {
    less_than_1: 'Menos de 1 ano',
    '1_to_3': '1 a 3 anos',
    '3_to_5': '3 a 5 anos',
    more_than_5: 'Mais de 5 anos'
  };
  const sizeLabels: any = {
    '1_to_3': '1 a 3 pessoas',
    '4_to_7': '4 a 7 pessoas',
    '8_to_15': '8 a 15 pessoas',
    more_than_15: 'Mais de 15 pessoas'
  };

  return `## PERFIL DE LIDERANCA DO GESTOR

- Tempo de lideranca: ${tenureLabels[data.leadership_tenure] || data.leadership_tenure}
- Tamanho do time: ${sizeLabels[data.team_size] || data.team_size}
- Maior desafio atual: ${data.biggest_challenge || 'Nao informado'}
- O que o energiza: ${(data.energizers || []).join(', ') || 'Nao informado'}
- O que o drena: ${(data.drainers || []).join(', ') || 'Nao informado'}
- Estilo de acompanhamento: ${data.monitoring_style || 'Nao informado'}
- Como da feedback dificil: ${data.difficult_feedback_style || 'Nao informado'}
- Reacao a baixa performance: ${data.low_performance_reaction || 'Nao informado'}
- Tipo de reconhecimento natural: ${data.recognition_type || 'Nao informado'}
- Feedback que recebe sobre si: ${data.feedback_received || 'Nao informado'}
- Objetivo de desenvolvimento: ${data.development_goal || 'Nao informado'}
- Legado desejado: ${data.desired_legacy || 'Nao informado'}

### COMO USAR ESTE PERFIL
1. Calibre o tom das sugestoes ao estilo natural do lider
2. Detecte contradicoes entre intencao e comportamento (ex: quer dar autonomia mas monitoring_style = close)
3. Se difficult_feedback_style = avoid, encoraje proativamente conversas dificeis
4. Personalize sugestoes de mensagens ao estilo do lider`;
};
```

**Injecao no system prompt:**

A secao sera inserida logo apos `formatWorkStyle(workStyleData)` e antes de `## HISTORICO DE NOTAS`, assim o Mentor tem visao completa de ambos os perfis (liderado + lider).

### O que NAO muda

- Camada 1 (roteador semantico)
- Camada 2 (compressao de feedbacks)
- Fluxo contextMode manual/auto
- Nenhum componente de frontend alem da passagem da prop
- Constituicao Rhitmo (`_shared/rhitmo-constitution.ts`)
