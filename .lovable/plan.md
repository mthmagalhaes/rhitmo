# Por que "[Alinhamento] Operações" não aparece no Rhitmo

## Causa raiz (confirmada nos logs e no banco)

A reunião existe na sua agenda, foi lida pela sincronização, mas foi **descartada como "reunião de grupo"** antes de chegar ao card de próximas 1:1s.

Log de hoje, em toda sincronização:

```text
[sync] Skipping group event "[Alinhamento] Operações" (5 other attendees)
```

A regra atual em `fetch-calendar-events` é: se houver **mais de 3 participantes humanos** além do líder, o evento é ignorado — sem sequer checar se são liderados seus. No evento de hoje havia 5 (Erika, Giovanna, Gabriela, Laís, Yasmin), várias delas suas lideradas. Resultado: nenhuma linha em `upcoming_meetings`, nenhum bot agendado, nada no card.

Isso também derruba, no seu calendário: "Alinhamento semanal" (7), "Steq <> Faster | Checkpoint" (6), "Alelo <> Faster | Quinzenal" (10), "Renovação Hubspot" (5).

Segundo efeito: como a reunião nunca entrou na lista, também não existe o botão "Chamar bot agora" para ela. Hoje só é possível acionar o bot manualmente em reuniões que passaram pelo filtro.

## O que fazer agora (a reunião já passou)

Não há como recuperar áudio retroativo — o Recall só grava ao vivo. O caminho é subir a transcrição do Google Meet ("Transcrições"/Gemini, se o Meet gerou) em Anotações & Evidências, usando Nova Nota > upload. Com a mudança do item 3 abaixo, você poderá atribuir esse mesmo arquivo às três lideradas presentes, com a lente pessoal de cada uma.

## Correções propostas

1. **Trocar a regra de corte por "tem liderado?" em vez de "quantas pessoas?"**
   Em `fetch-calendar-events`, primeiro casar os participantes com os liderados do líder e só então decidir:
   - 0 liderados casados: ignora (como hoje).
   - 1 a 5 liderados casados: registra o evento, uma linha por liderado.
   - Limite superior de segurança: ignora eventos com mais de 15 participantes humanos (all-hands, webinar) mesmo com liderados.
   Isso passa a incluir reuniões de time recorrentes, que é onde está o sinal de relacionamento mais rico.

2. **Distinguir 1:1 de reunião de time no card.**
   Marcar o registro com o tipo (`1:1` vs `Equipe`) e mostrar um chip discreto em "Próximas 1:1s", com os nomes dos liderados presentes. O bot continua deduplicado por link, então uma reunião de time gera um bot só e N anotações.

3. **Ação manual de resgate por link.**
   Em "Próximas 1:1s", um item "Chamar bot em outra reunião": o líder cola o link do Meet, escolhe um ou mais liderados e o bot entra na hora (`manual_retroactive`, join imediato). Cobre o caso de reunião em andamento que não está na lista.

## Detalhes técnicos

- `supabase/functions/fetch-calendar-events/index.ts` (linhas ~300-340): substituir o corte `humanOthers.length > 3` pela ordem "match primeiro, decide depois"; elevar `matchedSet.size` de 3 para 5; guarda-chuva de 15 humanos; gravar `meeting_type` no upsert.
- Migração: coluna `meeting_type text default '1on1'` em `upcoming_meetings` (com GRANT já existente na tabela).
- `src/components/dashboard/UpcomingMeetingsCard.tsx`: chip de tipo + diálogo "Chamar bot em outra reunião".
- `src/hooks/useCalendarIntegration.ts`: `scheduleBot` já aceita `meeting_url` + `trigger_source: 'manual_retroactive'`; o diálogo reusa essa mutation sem `meeting_id`.
- `supabase/functions/schedule-recall-bot/index.ts`: aceitar chamada sem `meeting_id` (hoje já é opcional na validação) e registrar `recall_bots.meeting_id = null` nesse caso.

Nada foi alterado ainda.
