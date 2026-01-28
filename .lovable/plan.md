
## Plano: Reativação de Features de UX (Metas, Chat com Threads)

### Diagnóstico Confirmado

| Feature | Status Atual | Ação Necessária |
|---------|-------------|-----------------|
| Metas Estruturadas (Goals 2.0) | Textarea simples | Criar componentes GoalsManager + GoalCard |
| Formatação Markdown Avaliações | Funcionando | Nenhuma |
| Mentor Chat com Threads | Dialog simples sem histórico | Redesenhar para split-view |

---

### Parte 1: Sistema de Metas Estruturadas

**Objetivo**: Substituir o Textarea atual por uma interface interativa de cards/tabela usando a tabela `goals`.

**Arquivos a criar:**
1. `src/components/GoalsManager.tsx` - Componente principal com tabs "Ativas" / "Histórico"
2. `src/components/GoalCard.tsx` - Card individual com barra de progresso e ações
3. `src/components/NewGoalDialog.tsx` - Modal para criar/editar metas

**Arquivo a modificar:**
- `src/pages/MemberDetails.tsx` - Substituir Textarea (linhas 490-525) por `<GoalsManager />`

**Estrutura Visual:**
```text
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Objetivos / Metas                           [+ Nova Meta]│
├─────────────────────────────────────────────────────────────┤
│ [Ativas (3)]  [Histórico (5)]                               │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Aumentar SQLs semanais                    📅 31/out     │ │
│ │ ████████████░░░░░░░░ 60% (15→25)                        │ │
│ │ Status: Em Andamento                    [✏️] [🗑️]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Concluir certificação AWS                 📅 28/fev     │ │
│ │ ░░░░░░░░░░░░░░░░░░░░ 0%                                 │ │
│ │ Status: Não Iniciado                    [✏️] [🗑️]       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidades do GoalsManager:**
- Query para buscar goals por `member_id`
- Tabs para filtrar por status: `active` | `completed` | `archived`
- Contagem de metas ativas + alerta vermelho para metas vencidas
- Botão "Nova Meta" abre NewGoalDialog

**Funcionalidades do GoalCard:**
- Exibir título, prazo (`target_date`), progresso (`metric_current` / `metric_target`)
- Barra de progresso visual (Progress component)
- Badge de status com cores (verde=concluída, amarelo=em andamento, vermelho=atrasada)
- Botões de ação: Editar (abre modal), Excluir (confirma), Concluir (muda status)

**Funcionalidades do NewGoalDialog:**
- Campos: Título, Descrição (RichTextEditor), Data Alvo, Métricas (opcional)
- Modo edição: Preenche campos com dados existentes
- Validação: Título obrigatório, data futura

---

### Parte 2: Mentor Chat com Interface de Threads

**Objetivo**: Transformar o modal simples em interface split-view com histórico de conversas.

**Arquivo a modificar:**
- `src/components/MentorChat.tsx` - Redesign completo

**Nova Estrutura Visual:**
```text
┌──────────────────────────────────────────────────────────────────┐
│ 🎯 Mentor Chat — João Silva (Analista)                     [X]   │
├────────────────────┬─────────────────────────────────────────────┤
│ Conversas          │ Conversa Atual                              │
│ ──────────────────│                                              │
│ [+ Nova Conversa] │ Como posso ajudar?                           │
│                    │                                              │
│ 📅 Hoje            │ ┌─────────────────────────────────────────┐ │
│ > Feedback Q3      │ │ 👤 Analisar padrões de comportamento    │ │
│                    │ └─────────────────────────────────────────┘ │
│ 📅 Ontem           │                                              │
│   Plano de PDI     │ ┌─────────────────────────────────────────┐ │
│                    │ │ 🤖 Com base nos 15 feedbacks...         │ │
│ 📅 Semana passada  │ └─────────────────────────────────────────┘ │
│   Riscos de turnov │                                              │
│   Roteiro 1:1      │                                              │
│                    │                                              │
├────────────────────┴─────────────────────────────────────────────┤
│ [📎] [Como posso ajudar você hoje?                    ] [🎤] [➤] │
└──────────────────────────────────────────────────────────────────┘
```

**Mudanças Técnicas:**
1. Usar `ResizablePanelGroup` para split-view (já instalado)
2. Query para `chat_threads` filtrado por `member_id` e `user_id`
3. Query para `mentor_messages` filtrado por `thread_id`
4. Estado `selectedThreadId` para controlar thread ativa
5. Auto-criar thread na primeira mensagem (título = primeiras palavras)
6. Agrupar threads por data (Hoje, Ontem, Semana passada)

**Estado do Componente:**
```typescript
const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
const [isCreatingNewThread, setIsCreatingNewThread] = useState(false);

// Query threads
const { data: threads } = useQuery({
  queryKey: ['chat-threads', memberId],
  queryFn: async () => {
    const { data } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('member_id', memberId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    return data || [];
  }
});

// Query messages for selected thread
const { data: messages } = useQuery({
  queryKey: ['mentor-messages', selectedThreadId],
  queryFn: async () => {
    if (!selectedThreadId) return [];
    const { data } = await supabase
      .from('mentor_messages')
      .select('*')
      .eq('thread_id', selectedThreadId)
      .order('created_at', { ascending: true });
    return data || [];
  },
  enabled: !!selectedThreadId
});
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/GoalsManager.tsx` | CRIAR - Componente de gerenciamento de metas |
| `src/components/GoalCard.tsx` | CRIAR - Card individual de meta |
| `src/components/NewGoalDialog.tsx` | CRIAR - Modal para criar/editar metas |
| `src/pages/MemberDetails.tsx` | MODIFICAR - Substituir Textarea por GoalsManager |
| `src/components/MentorChat.tsx` | MODIFICAR - Redesign para split-view com threads |

---

### Seção Técnica

**Dependências existentes utilizadas:**
- `react-resizable-panels` - Split-view (já instalado)
- `@tanstack/react-query` - Data fetching
- `date-fns` - Agrupamento por data
- Shadcn: Progress, Tabs, Badge, Card

**Schema da tabela goals (já existe):**
```sql
goals (
  id uuid PRIMARY KEY,
  member_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'active',
  start_date date,
  target_date date,
  metric_current numeric,
  metric_target numeric,
  metric_unit text,
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz
)
```

**Migração de dados (keyObjectives → goals):**
Se desejado, podemos criar uma migração para converter o campo texto `key_objectives` existente em registros estruturados na tabela `goals`. Isso seria opcional e feito via Edge Function ou SQL.
