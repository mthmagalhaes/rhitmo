# "Enviar agora" dá erro e permite empilhar bots

## O que está acontecendo

O botão "Enviar agora" marca o envio como um tipo de acionamento ("resgate manual") que o banco não aceita: a regra de validação da tabela de bots só permite "agenda automática" e "manual". Resultado:

1. O bot é criado de verdade na Recall e entra na reunião.
2. Na hora de gravar o registro no banco, a validação recusa, e a tela mostra "Bot scheduled but failed to save record".
3. Como não ficou registro, a trava contra duplicidade não enxerga nada. Cada novo clique cria mais um bot na mesma sala.

Só reuniões enviadas por esse botão (reunião já começada) são afetadas. O agendamento automático e o "Transcrever" antes do horário continuam normais.

## Correção

1. Passar a aceitar o tipo "resgate manual" na tabela de bots, para que o registro seja gravado e a trava de duplicidade volte a funcionar.
2. Rede de segurança: se por qualquer outro motivo o registro não puder ser gravado, cancelar o bot recém-criado na Recall antes de devolver o erro. Assim nunca sobra um bot fantasma na sala.
3. Melhorar a mensagem de erro para o líder: em vez do texto técnico em inglês, dizer que o envio falhou e que nenhum bot ficou na reunião.

## Detalhes técnicos

- Migração: `ALTER TABLE public.recall_bots DROP CONSTRAINT recall_bots_trigger_source_check` e recriar com `CHECK (trigger_source IN ('auto_calendar','manual','manual_retroactive'))`. Sem mudança de RLS ou grants.
- `supabase/functions/schedule-recall-bot/index.ts`, bloco `if (insertError)` (linha ~451): hoje só o caso `23505` cancela o bot na Recall. Extrair esse `DELETE /api/v1/bot/{id}/` para o caminho genérico de falha de insert e responder com mensagem em pt-BR ("Não consegui registrar o bot; ele foi cancelado, tente de novo.").
- Nada muda em `UpcomingMeetingsCard.tsx`, `useCalendarIntegration.ts`, `fetch-calendar-events` ou no webhook.

## Limpeza

Verificar se existem bots vivos na Recall sem registro correspondente (criados pelos cliques de hoje) e encerrá-los, se ainda houver.
