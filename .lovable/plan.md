<final-text>
Diagnóstico objetivo

- Não consigo fazer a chamada direta ao Recall neste modo read-only, mas os logs já provam que a API key está chegando ao Recall: a resposta é uma validação do próprio Recall, não um erro de autenticação.
- Erro exato hoje:
  - `transcription_options`: “This field is not allowed”
  - `recording_mode`: “This field is not allowed”
- Então o bot nunca é criado. Por isso:
  - com “Transcrição automática”, a reunião fica em “Pendente”;
  - no manual, todas entram em loading porque o card usa um único `scheduleBot.isPending` global.

Plano de correção

1. Corrigir o payload enviado ao Recall
- Arquivos:
  - `supabase/functions/schedule-recall-bot/index.ts`
  - `supabase/functions/fetch-calendar-events/index.ts`
- Trocar o body atual pelo formato suportado pela documentação, usando o payload mínimo:
```json
{
  "meeting_url": "...",
  "join_at": "...",
  "bot_name": "Rhitmo",
  "recording_config": {
    "transcript": {
      "provider": {
        "meeting_captions": {}
      }
    }
  }
}
```
- Remover os campos inválidos de topo.
- Fazer a função devolver o motivo real do Recall em caso de erro.

2. Arrumar a UX/status do card
- Arquivos:
  - `src/hooks/useCalendarIntegration.ts`
  - `src/components/dashboard/UpcomingMeetingsCard.tsx`
- Usar loading por reunião, não global.
- Mostrar estados corretos:
  - `Pendente` = aguardando tentativa de agendamento
  - `Agendado` = bot criado com sucesso
  - `Falhou` = Recall rejeitou o agendamento
- Exibir o erro real no toast/card em vez do genérico “Erro ao agendar bot de transcrição”.

3. Garantir que a transcrição caia no diário após a reunião
- Arquivo:
  - `supabase/functions/recall-webhook/index.ts`
- Alinhar o pós-reunião com a doc do Recall:
  - esperar o artefato de transcript/recording ficar pronto;
  - recuperar a transcrição via `recordings[].media_shortcuts.transcript.data.download_url`;
  - então criar `meeting_transcripts` e `feedbacks`.
- Isso evita depender só do `bot.done`, que pode chegar antes da transcrição estar pronta.

4. Teste ponta a ponta após implementar
- validar agendamento manual;
- validar `Transcrição automática` + `Sincronizar`;
- confirmar se a reunião da Giovanna sai de `Pendente` para `Agendado`;
- admitir o bot no Google Meet se a sala pedir;
- confirmar que, ao final da reunião, a transcrição aparece no fluxo esperado.

Detalhes técnicos

- Não parece ser problema de API key inválida.
- O problema principal é contrato incorreto com a API do Recall.
- Para a correção principal, não preciso de migração de banco.

Resultado esperado

- O clique em “Sincronizar” passa a realmente criar o bot.
- O botão “Transcrever” deixa de colocar todas as reuniões em loading ao mesmo tempo.
- A reunião da Giovanna às 15:30 pode ficar `Agendada`.
- Depois da reunião, a transcrição poderá ser processada e salva corretamente.
</final-text>