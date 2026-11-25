# Corrigir a lista "Próximas 1:1s" da Yas

## O que já está certo no código
- A sincronização da agenda já ignora eventos de dia inteiro.
- O card já esconde reuniões sem link de vídeo.

Então a tela da Yas provavelmente mostra **reuniões antigas salvas antes dessas regras** (os "GRUPO MEMORIAL" às 21h) ou uma versão em cache do app. Por isso a tela dela difere da sua.

## Passos
1. **Confirmar com os dados dela** (só leitura): listar as próximas reuniões salvas da Yas, ver quais têm link, quais são de dia inteiro e se são "equipe" ou "1:1".
2. **Limpar o que sobrou**: remover da lista dela (e de qualquer líder) as reuniões futuras de dia inteiro que ficaram salvas antes do filtro, sem tocar em bots ou transcrições já feitas.
3. **Reunião de equipe sem botão**: quando uma reunião de equipe aparecer sem link de vídeo, mostrar o texto "Sem link de vídeo, o bot não consegue entrar" no lugar do toggle, em vez de ficar vazia.
4. **Rodapé mais claro**: trocar "precisam ser ativadas uma a uma" por "Ative o bot em cada reunião de equipe pela chave ao lado" e só exibir quando houver chave visível.
5. **1:1 com "Auto"**: adicionar ação "Não gravar esta" no selo Auto, cancelando só aquele bot.
6. **Teste automático** para a regra "evento de dia inteiro nunca entra na lista" e "reunião sem link não oferece bot".
7. Validar no navegador com uma conta de teste e preparar mensagem curta para o Guto pedir à Yas recarregar a página.

## Detalhes técnicos
- Dados: `upcoming_meetings` filtrados pelo `user_id` da Yas; limpeza via SQL de dados (não migration) para linhas futuras sem horário (`start_time` em 00:00 UTC vindas de `start.date`), conferidas antes.
- UI: `src/components/dashboard/UpcomingMeetingsCard.tsx` (linhas ~331-360 e ~606).
- Cancelar bot individual reutiliza `dismiss_recall_bot`.
- Teste junto a `supabase/functions/fetch-calendar-events/allDay.ts`.
