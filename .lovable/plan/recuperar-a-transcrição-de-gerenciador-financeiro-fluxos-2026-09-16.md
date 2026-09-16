# Recuperar a transcrição de "Gerenciador Financeiro & Fluxos"

## O que aconteceu (confirmado)

A gravação existe e está inteira no serviço de transcrição, mas nunca chegou ao Rhitmo.

- O bot enviado pelo botão "Enviar agora" gravou a sala `vug-qweq-piu` das 14:03 às 14:45 UTC de 16/09, com transcrição pronta (220 trechos, ~40 mil caracteres).
- Os participantes reconhecidos são exatamente três: Matheus Magalhaes (anfitrião), Erika Buonopane e Gabriela Lucas.
- No banco do Rhitmo não existe nenhum registro desse bot (nenhuma linha com origem "resgate manual" jamais foi gravada). Foi o erro "Bot scheduled but failed to save record" de ontem: o bot subiu, mas o registro não.
- Sem esse registro, o aviso de fim de reunião chegou e foi descartado ("bot não encontrado nos nossos registros"), então não houve transcrição, anotação nem evidência para ninguém.
- O segundo bot da mesma sala (o clique repetido) ficou só na sala de espera e não gravou nada — nada a recuperar dele.

A correção que já aplicamos ontem impede o problema daqui pra frente. Falta recuperar esta reunião específica.

## O que vou fazer

1. **Criar uma rota de resgate** (uso interno, restrita ao super admin) que recebe o identificador de um bot já gravado e reprocessa a reunião usando exatamente o mesmo caminho do fluxo normal: baixa a transcrição, identifica os participantes, cria a transcrição e a anotação de cada liderado, dispara o resumo estruturado e os sinais da reunião.
2. **Rodar o resgate para esta reunião**, com o líder Matheus e o título "Gerenciador Financeiro & Fluxos". O reconhecimento por nome vai casar Erika e Gabriela automaticamente; se algum nome não casar, informo os dois liderados explicitamente.
3. **Conferir o resultado**: cada uma das duas deve ficar com a transcrição, a anotação no diário do líder e o resumo (TL;DR, tópicos, decisões, próximos passos) com a lente pessoal dela.
4. **Fechar a brecha**: quando chegar o aviso de fim de reunião de um bot desconhecido, em vez de simplesmente descartar, o sistema passa a registrar o caso para resgate em vez de perder a reunião em silêncio.

## Detalhes técnicos

- Nova edge function `recover-recall-bot`: valida `supabase.auth.getUser()`, exige super admin, busca o bot na Recall, confere que a gravação está concluída, insere a linha faltante em `recall_bots` (`trigger_source='manual_retroactive'`, `leader_detected=true`, `user_id` do líder, `meeting_url`) e dispara o processamento.
- Para não duplicar lógica, `recall-webhook` ganha um gatilho interno autenticado por `x-internal-key` (service role) que aceita `{ event: 'bot.done', data: { bot: { id } } }` e cai direto em `handleBotDone`, reaproveitando `findAllMeetingMembers`, `createTranscriptAndFeedback`, `summarize-transcript` e `compute-meeting-signals`.
- Idempotência: se já existir linha para o `recall_bot_id`, a rota não cria outra; e o resgate só roda quando não há transcrição associada.
- Bot alvo: `779c5124-c74f-421d-81da-18847fcd1656`; líder `matheus.magalhaes@fstr.co`; liderados `Erika Buonopane` e `Gabriela Lucas` (mesmo time, Business Ops).
- Sem mudança de RLS, de preço ou de visibilidade: as anotações nascem privadas do líder, como em toda reunião transcrita.
