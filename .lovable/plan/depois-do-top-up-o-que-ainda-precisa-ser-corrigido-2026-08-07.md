# Depois do top-up: o que ainda precisa ser corrigido

Com o saldo da Recall recarregado, o bloqueio principal saiu. Mas os dados mostram que crédito não era o único problema.

## O que os números dizem

Nos últimos 40 dias de `recall_bots`:

```text
skipped_no_leader   23
done                 8
processing           4
error                2
```

Ou seja: mesmo quando havia crédito, **~2 em cada 3 bots eram removidos automaticamente** por "líder não detectado". Isso é maior que o problema de saldo. Os 4 casos do Vitor que o Guto reportou são parte desse padrão, não uma exceção.

O cron de sincronização de calendário (`sync-calendars-every-15min`) já está ativo, então o agendamento automático volta sozinho agora que há saldo.

## Correção 1 — parar de matar bot por "líder não detectado" (prioridade)

Hoje `check-pending-leader-presence` remove o bot se não achar o e-mail nem o nome do líder entre os participantes em ~5 min. O Google Meet esconde e-mail de quem não está no convite do Calendar, e o nome no Meet frequentemente difere do `full_name` cadastrado, então o resolver erra para o lado de remover.

Mudanças propostas:
1. Considerar o bot válido também quando **o liderado esperado** (`member_id`) estiver presente — hoje só o líder conta.
2. Aumentar a janela: `MAX_ATTEMPTS` de 3 para 6 (cobertura de ~18 min em vez de ~9), e nunca remover antes de 10 min de gravação.
3. Match de nome mais tolerante: normalizar acentos/caixa e aceitar match por primeiro+último nome, além de comparar com o nome do `team_members` correspondente.
4. Quando o resolver terminar inconclusivo depois de todas as tentativas, **deixar o bot gravando** em vez de remover. Custo de uma gravação a mais é muito menor que perder a 1:1.
5. Registrar em `error_message` o motivo real e a lista de participantes vistos, para auditoria.

## Correção 2 — visibilidade de saldo/erro da Recall

Você só descobriu o saldo zerado porque investigamos. Proposta:
- Quando `schedule-recall-bot` ou `fetch-calendar-events` receberem erro de crédito da Recall, além de gravar `status='error'`, disparar **uma DM no Slack para o super admin** (com throttle de 1 por hora) avisando que a conta de transcrição está bloqueada.
- Mostrar no card "Próximas 1:1s" o `error_message` do último bot em erro, para o líder não ficar achando que clicou errado.

## Correção 3 — validar de ponta a ponta agora que há saldo

Depois dos ajustes, agendar um bot real numa reunião de teste e acompanhar a transição `scheduled → joining → in_call_recording → done`, confirmando que a detecção de líder não derruba mais.

## Ainda em aberto (preciso de informação)

- **Guto / acesso somente leitura:** o papel `hr_admin` está correto no banco e a regra da tela libera edição para HR Admin ou dono. Preciso saber **qual aba e qual botão** apareceram bloqueados para ele.
- **Caio / problema de integração:** preciso do e-mail dele e da mensagem de erro exata (Slack? Google Calendar?).

## Detalhes técnicos

- `supabase/functions/check-pending-leader-presence/index.ts`: lógica de `processBot` (janela, tentativas, fallback de não remover) e resolução de candidatos de nome.
- `supabase/functions/_shared/recallParticipants.ts`: normalização de nomes no `isLeaderPresent`, mais aceitar lista de participantes esperados.
- `supabase/functions/schedule-recall-bot/index.ts` e `fetch-calendar-events/index.ts`: alerta de crédito ao super admin.
- `src/components/dashboard/UpcomingMeetingsCard.tsx`: exibir `error_message` do último bot em erro.
