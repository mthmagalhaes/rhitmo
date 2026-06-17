# Diagnóstico + proposta: ciclo de vida do Recall bot

## 1. O bot apareceu na sua reunião com a Gabriela? **Não.**

Bot encontrado no banco para `meet.google.com/jnb-jxmx-bbm`:

- `recall_bot_id`: `d3ab49f9-f44a-4d86-9a13-2cb098d2b759`
- `status`: ainda `scheduled` (nunca foi atualizado para `joining` / `in_call`)
- `scheduled_at`: **2026-06-17 16:58 UTC = 13:58 BRT**
- Reunião real (em `upcoming_meetings`): **14:00–14:30 UTC = 11:00–11:30 BRT**
- Criado em: 16/06 12:56 UTC pelo `auto_calendar` (sync do Google)

**Conclusão técnica:** o bot foi agendado para ~3 horas *depois* do início real. Quando ele "acordaria" (13:58 BRT), a reunião já tinha acabado há ~2h30. Por isso ninguém viu o bot — ele literalmente não tentou entrar enquanto vocês estavam lá.

**Bug provável (a investigar em build mode):** o `start_time` enviado ao `schedule-recall-bot` está com 3h de offset — clássico bug de timezone em evento recorrente do Google (instância criada antes de mudança de DST ou TZ do organizador interpretada errado pelo `fetch-calendar-events`). `upcoming_meetings` ficou correto, mas o agendamento do bot, não. Vale auditar todos os `recall_bots` com `scheduled_at` divergente do `upcoming_meetings.start_time` do mesmo `meet_link`.

---

## 2. Cenários de UX que você levantou

Hoje o bot é uma caixa-preta após o agendamento: ou aparece, ou não. Proposta de 3 capacidades novas, todas usando APIs que o Recall.ai já suporta:

### A) Sala de espera — admitir / rejeitar do lado do líder

Quando o host do Google Meet exige admissão, o bot fica em `in_waiting_room`. Hoje o `automatic_leave.waiting_room_timeout` está em 120s — depois disso ele desiste silenciosamente.

Proposta:

- Aumentar `waiting_room_timeout` para 300s (5 min) para dar tempo do líder atrasado entrar e admitir.
- Se expirar: status `skipped_waiting_room` + DM "não consegui entrar, quer que eu tente de novo?".

### B) Bot rejeitado / removido

Hoje não tratamos `bot.rejected` nem `bot.removed_by_host`. Proposta:

- Status novos: `rejected`, `removed`.
- DM imediata no Slack explicando + opção "Tentar de novo" (que dispara o cenário C).

### C) Late-join — colocar o bot na reunião já em andamento

Esse é o caso de hoje. Você chegou atrasado, o bot nem ia mais. Proposta:

- **Botão "Chamar Rhitmo agora"** em 3 lugares:
  1. Card "Próximas 1:1s" em `/lider/inicio` (substituir/ adicionar ao ícone de link externo).
  2. DM no Slack 5 min antes e durante a janela da reunião: *"Quer que eu entre agora?"* com botão.
  3. Comando Slack `/rhitmo gravar` (ou similar) para invocar via texto.
- Backend: chama `schedule-recall-bot` com `trigger_source: "manual_retroactive"` (que já existe e suporta `start_time` no passado até 45 min). Hoje isso só funciona via UI da página de 1:1s — falta deixar exposto no Home e no Slack.
- Regra: se a reunião terminou há mais de 5 min, mostrar mensagem amigável em vez do botão.

### D) Reagendar automaticamente quando detectar a divergência de horário

Cron `*/5` que olha `recall_bots.status='scheduled'` cruzando com `upcoming_meetings.start_time`. Se divergem em mais de 10 min, cancela o bot no Recall e reagenda com o horário correto. Isso evita que o bug de hoje volte a acontecer enquanto o root cause é corrigido.

---

## 3. O que eu preciso decidir com você antes de virar build > Faça essas de baixo:

1. **Priorização:** o que entra primeiro? Minha recomendação é **C (late-join) + D (auto-reagendar)** — resolvem o caso de hoje e o caso recorrente sem depender de webhook novo do Recall.
2. **Sala de espera:** vale investir agora ou só depois que A/B/C/D estabilizarem? (precisa configurar webhook do Recall — escopo maior).
3. **Investigação do root cause TZ:** quer que eu já abra um sub-plano para corrigir o `start_time` que o `schedule-recall-bot` recebe? Sem isso, o D vira band-aid permanente.