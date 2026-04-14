

## Diagnóstico: Transcrição ainda em inglês

**Causa raiz:** O bot da reunião com Gabriela foi agendado usando a versão **antiga** da edge function (que usava `meeting_captions` — legendas nativas do Google Meet em inglês). O código já está correto com `recallai_streaming` + `language_code: "auto"`, mas as edge functions precisam ser **deployadas** para que as próximas reuniões usem o novo provider.

**Nota:** A transcrição da Gabriela que já foi feita **não pode ser corrigida** — ela usou `meeting_captions` que captura no idioma do Meet. As próximas reuniões é que serão transcritas no idioma correto.

## Plano

1. **Deploy das edge functions** — `schedule-recall-bot` e `fetch-calendar-events` para garantir que o código com `recallai_streaming` está ativo em produção

2. **Verificar nos logs** — Após o deploy, confirmar que a próxima reunião agendada usa o provider correto checando os logs do `schedule-recall-bot`

Nenhuma alteração de código necessária — apenas deploy.

