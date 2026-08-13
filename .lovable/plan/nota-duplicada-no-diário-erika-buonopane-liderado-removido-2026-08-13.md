# Nota duplicada no Diário: "Erika Buonopane" + "Liderado removido"

## O que aconteceu (confirmado nos dados)

A reunião "Checkpoint Finance" (13/08/2026) gerou **duas** anotações do bot, com o mesmo conteúdo bruto mas resumos diferentes:

- uma para a liderada **Erika Buonopane** (correta);
- outra para um cadastro chamado **"Matheus"** (e-mail pessoal `mth.magalhaes@gmail.com`), que é **o próprio líder cadastrado como liderado** e está **arquivado desde 10/06/2026**. Como está arquivado, a interface mostra "Liderado removido".

Causa raiz: no processamento do bot, o casamento por nome entre participantes da reunião e os cadastros do time busca **todos** os `team_members` dos times do líder, sem excluir (a) cadastros arquivados e (b) o cadastro que representa o próprio líder. O participante "Matheus" casou com esse registro fantasma e gerou uma segunda anotação com "lente pessoal" para ele mesmo.

Os resumos são diferentes porque a lente pessoal é gerada por pessoa: uma olha o que a Erika trouxe, a outra o que o "Matheus liderado" trouxe.

## Sobre apagar manualmente

Sim, pode apagar a anotação "Liderado removido". Ela é redundante (mesma transcrição) e aponta para um cadastro arquivado. A anotação da Erika permanece completa.

## Correção para não repetir

1. **Filtrar no casamento por nome** (`recall-webhook`, `findAllMeetingMembers`): ignorar cadastros com `archived_at` preenchido e ignorar o cadastro cujo `user_id` é o próprio líder da reunião.
2. **Mesma regra nos outros caminhos**: os membros vindos de `upcoming_meetings` também passam a ser validados contra arquivados / auto-cadastro antes de virar anotação.
3. **Limpeza pontual**: remover a anotação órfã já criada (a de "Liderado removido" da Checkpoint Finance) e verificar se existem outras anotações históricas apontando para cadastros arquivados, listando-as para sua decisão antes de qualquer exclusão em massa.

## Detalhes técnicos

- Arquivo: `supabase/functions/recall-webhook/index.ts`, função `findAllMeetingMembers` (consulta `team_members` por `team_id`, hoje sem filtros).
- Adicionar `.is('archived_at', null)` e descartar `member.user_id === userId`.
- Aplicar o mesmo descarte na união final de `memberIds`, cobrindo os caminhos de `google_event_id` e `meet_link`.
- Sem migração de schema; apenas lógica da edge function + limpeza de dados pontual.
