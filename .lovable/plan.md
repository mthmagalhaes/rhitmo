Diagnóstico encontrado

- No evento `alinhamento isaac` do usuário `matheus.magalhaes@fstr.co`, havia um bot automático criado para `2026-06-23 12:58 UTC` e depois marcado como `skipped_no_leader`.
- O botão manual hoje chama a mesma função de agendamento, mas a função bloqueia qualquer novo bot se já existir um registro com o mesmo `meeting_id` cujo status não seja `error`.
- Como `skipped_no_leader` não é `error`, o reenvio manual fica bloqueado por deduplicação, mesmo sendo exatamente o caso em que deveríamos permitir resgate.
- A documentação da Recall confirma que bot criado com `join_at` em menos de 10 minutos, ou sem `join_at`, vira bot ad-hoc. Isso é o caminho certo para “entrar agora”, mas pode falhar por pool/limite com erro `507`; nesses casos é preciso retry usando `Retry-After`.
- A documentação também recomenda usar webhooks para status (`joining_call`, `in_waiting_room`, `in_call_recording`, `fatal`, `done`) e não depender só do retorno inicial da criação do bot, porque “criado” não significa “entrou”.

Plano de correção

1. Corrigir a deduplicação do resgate manual
   - Em `schedule-recall-bot`, tratar `manual_retroactive` como uma ação de resgate.
   - Permitir criar um novo bot quando o bot anterior estiver em estados finais ou recuperáveis: `skipped_no_leader`, `error`, `unrecoverable`, `done`.
   - Se existir um bot antigo automático nesse estado, preservar o histórico, mas não bloquear o novo envio.

2. Criar join realmente imediato para “Enviar bot agora”
   - Para `manual_retroactive`, omitir `join_at` ou usar um valor ad-hoc adequado conforme a Recall, em vez de sempre `now + 30s`.
   - Manter a janela de segurança de reunião iniciada há até 45 minutos, para evitar disparos inúteis muito depois do fim.
   - Aumentar `waiting_room_timeout` do Google Meet para o máximo suportado pela Recall: `600s`, para dar mais tempo ao host aceitar o bot.

3. Implementar retry controlado para falhas ad-hoc da Recall
   - Se a Recall responder `507`, `502`, `503`, `504` ou `429`, não retornar apenas erro seco.
   - Salvar/retornar uma resposta clara: “tentando novamente em instantes”.
   - Fazer retry com backoff curto respeitando `Retry-After` quando existir.
   - Não criar vários bots duplicados para o mesmo clique.

4. Melhorar status e feedback no card
   - Depois do clique, mostrar estado real: `Solicitado`, `Entrando`, `Na sala de espera`, `Gravando`, `Falhou`.
   - Incluir tooltip/descrição para `Na sala de espera`: o host precisa aceitar o Rhitmo no Google Meet.
   - Se a Recall retornar `bot_kicked_from_waiting_room` ou `fatal`, mostrar opção de “Tentar de novo”.
   - Invalidar/refazer a consulta de bots logo após o clique e em intervalos curtos por alguns minutos, para o líder não ficar com falsa sensação de sucesso.

5. Fortalecer webhook e estados internos
   - Mapear `bot.in_waiting_room` para um status próprio (`in_waiting_room`) em vez de misturar com `joining`.
   - Salvar `error_message` com `sub_code` em eventos `bot.fatal` e rejeição da sala de espera.
   - Garantir que bots manuais nunca sejam removidos pela rotina automática de “líder ausente”.

6. Adicionar observabilidade mínima
   - Logar no registro do bot: origem (`manual_retroactive`), tentativa, erro da Recall, `Retry-After`, e status final.
   - Isso permitirá responder rapidamente se o bot ficou em sala de espera, foi rejeitado, não tinha pool ad-hoc, ou o link estava inválido.

Validação

- Reproduzir o caso do `alinhamento isaac`: com um bot antigo `skipped_no_leader`, clicar em “Enviar bot agora” deve criar um novo registro de bot, não retornar conflito.
- Confirmar que o card muda para `Entrando` ou `Na sala de espera` após o clique.
- Confirmar via webhook que o status evolui para `Gravando` quando o bot é aceito no Meet, ou para erro acionável quando é rejeitado/falha.
- Testar também uma reunião futura para garantir que o agendamento automático normal continua usando bot agendado com antecedência.