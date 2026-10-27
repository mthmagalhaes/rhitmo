# Suporte: bot não entra nas calls da Yasmin (Faster)

## Diagnóstico (conta yasmin.nobrega@fstr.co)

- **Tem direito ao bot:** sim. Workspace Faster é legado com condição especial até 31/12/2027, então não há bloqueio de plano ou de horas.
- **Agenda conectada:** sim, com renovação funcionando (renovada hoje, 27/10).
- **Causa provável:** a chave **"Transcrição automática"** está **desligada**. Com ela desligada, a Rhitmo lê a agenda mas não manda o bot sozinho. O último bot dela foi em 14/07 (dois dos últimos falharam no serviço de gravação); desde então, nenhum.
- **Slack:** conectado.
- **Tutorial:** já existe em Configurações → Ajuda ("Conectar sua agenda", "Bot de transcrição" e a pergunta "O bot não entrou na minha reunião"). Mas o texto está desatualizado: aponta para "Configurações → Integrações" (hoje é a página Conectores) e diz que o bot espera 10 minutos na sala de espera (o envio automático espera 15).

## Mensagem para o Guto

> Oi Guto! Que bom que ficou 100%, valeu por publicar.
>
> Sobre a Yas: olhei a conta dela. A agenda está conectada certinho e ela tem direito ao bot, mas a opção **"Transcrição automática"** está desligada. Por isso o bot não entra sozinho.
>
> Pra ela resolver (leva 10 segundos):
> 1. Entrar na Rhitmo e ir em **Início**, no card **"Próximas 1:1s"**.
> 2. Ligar a chave **"Transcrição automática"**.
> 3. Pronto: nas próximas 1:1s com link de Meet/Zoom/Teams, o bot "Rhitmo" entra cerca de 2 min antes. Se tiver sala de espera, é só admitir.
>
> Se em alguma reunião ele não aparecer, dá pra chamar na hora pelo ícone de microfone ("Chamar bot agora") no mesmo card, mesmo com a call já rolando.
>
> E sim, já tem tutorial dentro da Rhitmo: **Configurações → Ajuda**, nas seções "Conectar sua agenda" e "Bot de transcrição". Vou deixar esse passo a passo mais visível e atualizado essa semana. Se ela preferir, faço uma call rápida de 10 min com ela.

## Ajustes no produto (após aprovação)

1. Atualizar textos da Ajuda: trocar "Configurações → Integrações" pelo caminho real (Conectores / card "Próximas 1:1s"), corrigir o tempo de espera da sala, e deixar explícito "ligue a Transcrição automática".
2. Aviso no card "Próximas 1:1s" quando a agenda está conectada mas a Transcrição automática está desligada: "O bot não vai entrar sozinho. Ligar agora?" com o botão direto.
3. Registrar o ticket de suporte (TKT) com o diagnóstico acima e marcar resolvido depois que a Yas confirmar.

## Detalhes técnicos

- `google_calendar_tokens.auto_transcribe = false` para o usuário; `fetch-calendar-events` só agenda bots com `autoTranscribe === true`.
- `checkV3BotEntitlement` retorna `applies: false` (workspace `billing_model = legacy`, `grandfather_until = 2027-12-31`).
- Textos em `src/pages/HelpCenter.tsx` (l.111, 149, 166, 333); aviso novo em `UpcomingMeetingsCard.tsx` usando `useCalendarIntegration`.
- Não foi aberto ticket nesta etapa porque o modo de planejamento não permite gravações.
