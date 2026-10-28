# Limpar a lista "Próximas 1:1s" (lembretes e eventos sem vídeo)

## Objetivo
A tela da Yasmin (e de qualquer líder) deve mostrar só reuniões reais com link de vídeo. Lembretes de dia inteiro e eventos sem Meet/Zoom/Teams somem da lista. Nenhuma regra de bot, cobrança ou agendamento muda.

## O que muda para o líder
- Eventos de **dia inteiro** (ex.: "GRUPO MEMORIAL") deixam de aparecer.
- Eventos **sem link de vídeo** deixam de aparecer no card.
- Rodapé do card ganha uma linha discreta: "Mostramos só reuniões com link de Meet, Zoom ou Teams."
- Chave "Transcrição automática" e o toggle por reunião de equipe continuam iguais.

## Passos
1. **Sincronização da agenda:** ignorar eventos de dia inteiro (vêm do Google sem horário, só com data). Eles não são gravados e não geram bot nem brief.
2. **Limpeza dos que já estão salvos:** remover das próximas reuniões os registros de dia inteiro já sincronizados que não têm bot agendado (apenas futuros; histórico intocado).
3. **Card Próximas 1:1s:** esconder reuniões sem link de vídeo e adicionar a linha explicativa no rodapé.
4. **Ajuda:** uma frase na seção "Transcrição Automática" explicando o filtro.

## Por que eventos sem vídeo só somem do card (e não do sistema)
Uma 1:1 presencial sem link ainda gera o lembrete de preparação no Slack (pauta antes da conversa). Escondendo só na tela, a Yasmin fica com a lista limpa e ninguém perde o brief.

## Verificação
- Teste automático da regra "é dia inteiro?" (evento com só data = ignorado; evento com horário = mantido).
- Rodar a sincronização da Yasmin e conferir que os lembretes somem e a 1:1 com Renato permanece.
- Abrir o card no navegador (computador e celular).
- Atualizar o ticket TKT-2610-0428 para resolvido.

## Detalhes técnicos
- `supabase/functions/fetch-calendar-events/index.ts`: antes do match de membros, `if (event.start?.date && !event.start?.dateTime) { skippedAllDay++; continue; }`, com contador no log. Extrair helper puro `isAllDayEvent` para teste (`bun:test`).
- Limpeza via insert/delete tool: `DELETE FROM upcoming_meetings WHERE start_time > now() AND <dia inteiro: start_time à 00:00 e duração múltipla de 24h> AND id NOT IN (bots agendados)`; conferir com SELECT antes.
- `src/components/dashboard/UpcomingMeetingsCard.tsx`: filtrar `meetings.filter(m => !!m.meet_link)` na renderização; texto do rodapé.
- `HelpCenter.tsx`: uma frase.
- Deploy de `fetch-calendar-events`.
