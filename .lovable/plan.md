# Conectores de note taker — fechar a Fase 1 e avançar

A Fase 1 do Granola está no ar (card em Configurações > Conectores, chave criptografada, cron a cada 30 min ativo, chip "Granola" no Diário). Revisando o que foi entregue, faltam três pontas da própria Fase 1 e há dois bugs de robustez no motor de sincronização.

## O que faltou na Fase 1

**1. Notas "sem liderado" somem sem aviso.** Hoje, quando a Rhitmo não consegue casar nenhum participante da nota com um liderado, a nota é marcada como vista e descartada para sempre — sem tela, sem CTA, sem possibilidade de recuperar. O plano original previa que essas notas ficassem pendentes para o líder atribuir. Isso é a diferença entre "conectei e nada apareceu" e "conectei e a Rhitmo me perguntou de quem é".

Correção: manter a nota como pendente e criar uma seção "Notas aguardando atribuição" dentro do card do Granola, listando título, data e participantes, com um seletor de liderado. Ao escolher, a nota vira evidência normalmente (mesmo pipeline de resumo e lente pessoal). Botão para descartar também.

**2. Erro no meio da sincronização faz perder notas.** O relógio de sincronização (`last_synced_at`) avança mesmo quando a importação falha na metade, então as notas daquela janela nunca mais são buscadas. Correção: só avançar o relógio quando o ciclo termina sem erro, e usar como marca a data da nota mais recente importada em vez de "agora".

**3. Nenhuma visibilidade de erro real do Granola.** O card mostra `last_error`, mas mensagens como chave revogada não convidam à ação. Correção: quando o erro for de autenticação, o card passa a mostrar estado "Reconectar" em vez de "Sincronizar agora".

## Fase 2 — mais note takers

Generalizar o contrato para que adicionar provedor novo seja só um arquivo:

- Extrair uma interface `NoteTakerProvider` (verificar chave, listar notas, buscar nota, extrair e-mails e conteúdo) e mover o Granola para dentro dela.
- Adicionar **Fireflies** (API key pessoal, GraphQL) e **Otter** como implementações dessa interface.
- Card genérico de conector reaproveitado pelos três, com o passo a passo de onde gerar a chave variando por provedor.
- Chips de origem "Fireflies" e "Otter" no Diário, no mesmo padrão do Granola.

## Fase 3 — economia explícita (desligar o bot quando já há cobertura)

- Quando o líder tem note taker conectado, o card de próximas 1:1s ganha um seletor de captura por reunião: "Bot da Rhitmo" ou "Meu note taker".
- Preferência padrão do líder em Conectores: "usar meu note taker e não enviar o bot".
- Detecção de duplicidade: se chegar uma nota do note taker e já existir transcrição do bot para a mesma reunião (mesma janela de horário e mesmo liderado), a segunda entra como complemento e não como evidência duplicada.
- Card mostra a economia acumulada em horas de reunião não transcritas pelo Recall.

## Detalhes técnicos

- `_shared/noteTakerSync.ts`: parar de inserir linha de "visto" para nota sem match; passar a gravar `status = 'pending'` em `note_taker_synced_notes` (nova coluna) com os participantes em JSON. Mover a atualização de `last_synced_at` para dentro do caminho de sucesso.
- Migration: coluna `status` (`pending` | `imported` | `dismissed`) e `attendees jsonb` em `note_taker_synced_notes`; políticas de leitura para o próprio líder (`user_id = auth.uid()`) e GRANT para `authenticated`.
- `note-taker-connect`: novas ações `list_pending`, `assign` (note_id + member_id) e `dismiss`, todas com checagem de posse da conexão antes de usar service role.
- Frontend: `useNoteTaker` ganha `pending`, `assign`, `dismiss`; `GranolaConnectorCard` ganha a lista de pendentes.
- Fase 2 refatora `_shared/granolaClient.ts` para `_shared/noteTakers/{granola,fireflies,otter}.ts` com um registry, sem mudar o formato da tabela.

## Sugestão de escopo

Fechar a Fase 1 agora (pendentes + relógio + reconectar). Fase 2 e 3 só depois de ver o primeiro líder real usando o Granola conectado — o dado de uso é o que decide qual provedor vem em seguida.
