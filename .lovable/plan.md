# Notas do Granola chegando sozinhas (e sem perder nenhuma)

## A ideia
O líder não deveria precisar lembrar de importar. Toda conversa gravada no Granola (ou Fireflies) chega sozinha na Rhitmo, vai para a pessoa certa e passa a alimentar insights, pautas e avaliações. Importar na mão vira exceção: só quando o líder quer escolher uma nota antiga.

## O que muda

### 1. Nenhuma nota fica para trás
- A sincronização passa a olhar sempre para trás com margem de segurança (as últimas 48h a cada rodada e 14 dias ao abrir o painel Importar), em vez de só "depois da última vez". Reuniões que terminam depois da sincronização, como a "Magá <> Yas", passam a entrar.
- O marcador de "até onde já li" só avança quando chegam notas de verdade.
- Notas repetidas continuam bloqueadas (a mesma nota nunca entra duas vezes).

### 2. Mais notas acham o dono sozinhas
- Apelidos e começos de nome: "Yas" reconhece Yasmin, "Gabi" reconhece Gabriela (3 letras ou mais, só quando aponta para uma única pessoa do time).
- Também olha o nome citado no começo do resumo, não só no título.
- Se o palpite for ambíguo (duas pessoas possíveis), a nota não entra sozinha: fica esperando o líder com a sugestão já marcada.

### 3. O líder vê o resultado, não o trabalho
- Na tela de Início, um aviso curto: "3 conversas novas do Granola entraram esta semana" com os nomes, e "1 esperando você dizer de quem é" quando houver.
- Nas notas que entraram sozinhas, um selo "Importada automaticamente" com opção de mover para outro liderado ou tirar da Rhitmo, caso o palpite esteja errado.
- As notas importadas já contam como evidência nas avaliações, pautas de 1:1 e no Pergunte à Rhitmo (já funciona hoje; nada muda para o líder).

### 4. Importar na mão continua existindo
- O painel Importar mostra os últimos 14 dias direto do Granola, inclusive notas que ainda não estavam na Rhitmo, e o líder escolhe quais viram evidência.

### 5. Resgate da conversa com a Yasmin
- Trazer a nota "Magá <> Yas" de 22/09 para as Anotações & Evidências da Yasmin, privada, com resumo.

## Fora desta rodada
- Novos note takers além de Granola e Fireflies.
- Escolher trechos dentro de uma nota (importa a nota inteira).

## Detalhes técnicos
- `noteTakerSync.ts`: `created_after = min(last_synced_at, now) - 48h`; paginação completa pelo cursor; `bumpWatermark` só com nota nova (remover o fallback `new Date()`); dedupe pelo `external_note_id` já existente.
- `note-taker-connect` `list_recent`: varredura de 14 dias paginada antes de listar.
- `matchMembers` e `suggestMember`: nome completo, primeiro nome e prefixo com 3+ letras por token do título/primeiras linhas do resumo; atribui só com match único, senão `pending` com `suggested_member_id`.
- Coluna `auto_assigned boolean` (ou reaproveitar `status`) em `note_taker_synced_notes` para o selo e a ação "mover"; ação `reassign` na função, com a mesma checagem de dono.
- Card de Início: contagem via `note_taker_synced_notes` dos últimos 7 dias.
- Resgate: rodar a importação da nota `not_qGKa2DXvpHWR4N` para a Yasmin após o deploy.
- Sem mudança de RLS: notas continuam privadas do líder.
