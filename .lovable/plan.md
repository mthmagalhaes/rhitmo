

## Sprint 2: Épico 3 (Embeddings) + Épico 2 (Slack Phase 2)

### Épico 3: Ativar Embeddings & RAG

**Objetivo**: Gerar embeddings para cada feedback e usar busca semântica no Mentor Chat.

#### Alteração 1: `supabase/functions/analyze-feedback-background/index.ts`
Após o update do feedback com summary/sentiment/coaching_tips (linha ~348), adicionar chamada à OpenAI Embeddings API:
- Chamar `text-embedding-3-small` com o `content` do feedback
- Salvar o vetor de 1536 dimensoes na coluna `embedding` do registro
- Envolver em try/catch para não bloquear a análise principal se falhar
- Usar o mesmo `openAIApiKey` já disponível na função

#### Alteração 2: `supabase/functions/chat-mentor/index.ts`
Na Camada 2 (Compressor, ~linha 72), quando `shouldFetchContext` retorna `true`:
- Gerar embedding da pergunta do usuário via `text-embedding-3-small`
- Chamar RPC `match_feedbacks` com o embedding, `member_id`, threshold 0.5, limit 10
- Mesclar resultados semânticos com as notas recentes (deduplicar por ID)
- Passar o contexto mesclado para `compressContext`
- Fallback: se a geração de embedding falhar, usar apenas as notas recentes (comportamento atual)

### Épico 2: Slack Phase 2 — `/brief` e `/meu-pdi`

**Objetivo**: Implementar handlers para os comandos já registrados e expandir o menu de liderados.

#### Alteração 3: `supabase/functions/slack-bot/index.ts`

**`handleBriefCommand`** (novo handler para líderes):
- Recebe o texto do comando (ex: `/brief @membro`)
- Resolve o membro via `resolveMember`
- Busca os 10 feedbacks mais recentes do membro + upcoming meetings
- Gera um resumo rápido in-function (sem chamar `generate-brief`, pois essa função requer `meetingId` e auth JWT — complexidade desnecessária)
- Alternativa mais simples: buscar feedbacks recentes + PDI ativo + próxima reunião e formatar em Slack blocks como um "mini-brief"
- Retorna blocks formatados com: resumo dos últimos feedbacks, sentimento predominante, ações pendentes, e próxima 1:1

**`handleMeuPdiCommand`** (novo handler para liderados):
- Verifica se persona é `direct_report`
- Busca o `development_plan` ativo do membro (status != 'completed') via `persona.memberId`
- Busca os `development_items` associados ao plano
- Formata em Slack blocks: título do plano, itens pendentes vs concluídos, próximo prazo

**`processCommand` switch**: Adicionar cases para `/brief` e `/meu-pdi`

**Menu de liderados**: Expandir o bloco `direct_report` em `buildRhitmoMenu` com botões:
- "📋 Meu PDI" (action_id: `action_meu_pdi`)
- "📊 Meu Brief" → link para o Rhitmo (URL button)

**`processInteraction`**: Adicionar handler para `action_meu_pdi` que executa a lógica do PDI inline

### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/analyze-feedback-background/index.ts` | Gerar embedding após análise e salvar na coluna `embedding` |
| `supabase/functions/chat-mentor/index.ts` | Busca semântica via `match_feedbacks` RPC na Camada 2 |
| `supabase/functions/slack-bot/index.ts` | Handlers `/brief` e `/meu-pdi`, menu expandido para liderados |

### Notas Técnicas
- Sem migrações SQL — coluna `embedding` e RPC `match_feedbacks` já existem
- O embedding usa `text-embedding-3-small` (1536 dims) via OpenAI, custo ~$0.0001/chamada
- O `/brief` no Slack gera um mini-brief direto (sem chamar a Edge Function `generate-brief` que depende de `meetingId`)
- O `/meu-pdi` funciona para liderados vinculados (com `linked_user_id`)

