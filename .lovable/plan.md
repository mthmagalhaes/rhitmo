# Sprint 9.2 — Pulse Surveys: Disparo & Resposta

Construir a interface gráfica sobre a fundação `pulse_surveys` (Sprint 9.1): líder dispara o pulse, liderado responde, trigger do banco propaga para `context_evidence`.

## Decisões de arquitetura

- **Sem Edge Function nova.** As políticas RLS já permitem INSERT pelo líder e UPDATE constrito pelo liderado. Usamos o cliente Supabase autenticado direto (com `safeQuery`/wrappers já existentes onde aplicável).
- **Catálogo de perguntas estático em arquivo TS** (`src/lib/pulseTemplates.ts`), reutilizável por Slack/AI no futuro. Cada tipo (`blockers`, `priorities`, `retro`, `goal_progress`) tem 2-3 perguntas com `id` estável.
- **Ponto de entrada do líder**: botão "Enviar Pulse" no header da página `/lider/contexto` (logo ao lado dos filtros). Local natural — é onde o líder já consome o Context Graph e percebe lacunas. Sem mudanças no sidebar (evita risco de quebrar navegação).
- **Ponto de entrada do liderado**: card de alerta no topo do `DirectReportDashboard` (acima do grid Pulse/Reviews já existente). Reutiliza padrões visuais do dashboard.

## Arquivos a criar

```text
src/lib/pulseTemplates.ts                              # catálogo de perguntas por tipo
src/hooks/usePendingPulseSurveys.ts                    # query liderado: surveys 'pending' do membro vinculado
src/components/pulse/SendPulseModal.tsx                # modal do líder (Dialog + Select liderado + Select tipo)
src/components/pulse/AnswerPulseModal.tsx              # modal do liderado (renderiza questions, salva responses)
src/components/pulse/SendPulseButton.tsx               # botão trigger reutilizável (abre SendPulseModal)
src/components/pulse/PendingPulseAlert.tsx             # card de alerta no dashboard do liderado
```

## Arquivos a editar

```text
src/pages/lider/Contexto.tsx                           # adicionar <SendPulseButton/> na barra sticky de filtros
src/components/dashboard/DirectReportDashboard.tsx     # montar <PendingPulseAlert/> no topo do dashboard
src/i18n/locales/pt-BR.json + en.json + es.json        # chaves nav.pulse.send, pulse.types.*, pulse.answer.*
```

## Detalhes técnicos

### `pulseTemplates.ts`
```ts
export type PulseType = 'blockers' | 'priorities' | 'retro' | 'goal_progress';
export interface PulseQuestion { id: string; text: string; placeholder?: string }
export const PULSE_TEMPLATES: Record<PulseType, { label: string; questions: PulseQuestion[] }> = {
  blockers:      { label: 'Bloqueios',        questions: [{id:'q1',text:'O que está bloqueando seu trabalho hoje?'},{id:'q2',text:'Como eu (líder) posso ajudar a destravar?'}] },
  priorities:    { label: 'Prioridades',      questions: [{id:'q1',text:'Quais são suas 3 prioridades para esta semana?'},{id:'q2',text:'Algo que devamos despriorizar?'}] },
  retro:         { label: 'Retrospectiva',    questions: [{id:'q1',text:'O que funcionou bem na última semana?'},{id:'q2',text:'O que não funcionou?'},{id:'q3',text:'O que queremos mudar?'}] },
  goal_progress: { label: 'Progresso de Metas', questions: [{id:'q1',text:'Como está o progresso da sua meta principal?'},{id:'q2',text:'Algum risco ou apoio necessário?'}] },
};
```

### `SendPulseModal`
- Reusa `MemberFilterSelect` pattern — mas com query própria filtrando só liderados do líder atual (`teams.leader_user_id = effective_user_id()` via join). Para simplicidade, query `team_members` por `workspace_id` igual ao `MemberFilterSelect`; RLS de INSERT em `pulse_surveys` já bloqueia se não for o líder.
- Select de tipo via shadcn `Select` + label de `PULSE_TEMPLATES`.
- Submit: `supabase.from('pulse_surveys').insert({ workspace_id, member_id, requested_by: user.id, type, questions: PULSE_TEMPLATES[type].questions, status: 'pending' })`.
- Toast + invalida `['pending-pulse-surveys']`.

### `usePendingPulseSurveys`
- Recebe `memberId` (do `useLinkedMember`).
- Query: `from('pulse_surveys').select('id, type, questions, sent_at, requested_by').eq('member_id', memberId).eq('status', 'pending').order('sent_at', { ascending: false })`.
- RLS já garante que o liderado vê apenas os próprios.

### `PendingPulseAlert`
- Se `data?.length > 0`, renderiza Card `rounded-2xl` ámbar suave: ícone Sparkles + "Você tem N pulses aguardando resposta" + botão "Responder agora" abrindo `AnswerPulseModal` para o primeiro item (próximos viram lista expansível se >1).

### `AnswerPulseModal`
- Renderiza `Textarea` por questão (`question.id` → estado local `responses[id]`).
- Submit: 
  ```ts
  supabase.from('pulse_surveys').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    responses: questions.map(q => ({ question_id: q.id, question_text: q.text, answer: state[q.id] ?? '' }))
  }).eq('id', surveyId);
  ```
- A trigger `ctx_evidence_from_pulse_survey` propaga automaticamente para `context_evidence`. `summary` fica null — sem problema (a trigger faz fallback para responses).
- Invalida `['pending-pulse-surveys']` e `['team-timeline']`.

## Riscos & mitigações

- **Não vou tocar em `team_members` queries existentes** nem `MemberFilterSelect` (reutilização cruzada arriscaria filtros do feed).
- **Sem Edge Function** mantém o blast radius contido — se algo der errado, é puramente client + RLS já testada.
- **i18n**: chaves novas adicionadas, sem renomear existentes.
- **Tipagem**: `Database['public']['Tables']['pulse_surveys']['Row']` já existe em `types.ts` → uso direto, sem casts.

## Fora de escopo (Sprint 9.3+)

- Geração AI das perguntas (por enquanto, só catálogo estático).
- Sumarização AI das respostas (`summary.tldr`) — virá quando criarmos `summarize-pulse` edge function.
- Notificações Slack/email ao liderado quando recebe pulse.
- Expiração automática (`expires_at`) e estado `expired`.
