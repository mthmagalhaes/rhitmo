## Problema

Hoje o botão **"Enviar agora"** só aparece quando o sistema detecta `botDriftedTooLate` OU `canSendRetroactive` (reunião acontecendo + sem bot ativo). Em todos os outros estados (`Auto ✓`, `Agendado`, `Entrando`, `Gravando`, `Transcrito`), o líder não tem como forçar o bot a entrar — exatamente o caso da reunião da Gabriela: o badge mostrava "Auto ✓" mas o bot nunca apareceu, e não havia ação no card.

## O que mudar

No card `UpcomingMeetingsCard.tsx`, adicionar um **botão secundário discreto "Chamar bot agora"** que fica sempre visível ao lado do status do bot, em qualquer estado *exceto* `recording` e `done` (onde já não faz sentido). Ele coexiste com o badge de status (`Auto ✓`, `Agendado`, `Entrando`, `Pendente`).

### Comportamento

- **Ícone:** `Mic` em botão fantasma pequeno (`h-7 w-7 rounded-lg`), cor `text-muted-foreground` com hover `text-primary` — discreto, não compete visualmente com o badge.
- **Tooltip:** "Chamar bot agora — útil se ele não entrou ou foi removido".
- **Clique:**
  - Se reunião ainda não começou (>5min até `start_time`): confirma "Enviar bot agora? Ele vai entrar na reunião imediatamente, mesmo antes do horário marcado."
  - Se reunião está rolando ou já passou do start: mesma confirmação atual ("vai gravar a partir deste momento").
  - Dispara `triggerBot(true)` (manual_retroactive) — já suporta substituir bot existente.
- **Disabled** se `!canScheduleBot` (limite do plano) ou `schedulingMeetingId === meeting.id` (em andamento).
- **Esconder** quando `bot.status === 'recording' | 'done'` ou quando `meeting.meet_link` é null.

### Onde encaixa visualmente

```text
[badge "Hoje 17:00"]                              [Auto ✓]  [🎙️]  [↗]
Yasmin Nóbrega                                    status   force  open
Exc. Criativa + Criahub > Next steps
```

O `[🎙️]` é o novo botão. Fica **entre** o badge de status e o link externo, com `opacity-0 group-hover:opacity-100 transition-opacity` para não poluir o card em estado idle — aparece no hover (padrão Linear/Notion).

## Arquivos

- `src/components/dashboard/UpcomingMeetingsCard.tsx` — adicionar o botão dentro do bloco `<div className="flex items-center gap-2 shrink-0">` antes do `<a>` do meet_link, e remover o `botDriftedTooLate` como gatilho exclusivo do botão grande "Enviar agora" (ele continua aparecendo no caso de drift detectado para chamar atenção, mas o ícone discreto serve como fallback universal).

## Fora de escopo

- Mudanças no edge function — `schedule-recall-bot` já aceita `trigger_source: 'manual_retroactive'` e substitui bot existente.
- Sala de espera (cenário A da conversa anterior).
- Notificação no Slack — fica para próximo sprint.
