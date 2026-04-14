

## Plano: Corrigir endpoint de transcrição (API v2) e recuperar reunião da Giovanna

### Causa raiz
O `recall-webhook` usa `/api/v1/bot/{id}/transcript/` — endpoint descontinuado pelo Recall.
A API agora requer:
1. `GET https://us-west-2.recall.ai/api/v2/bot/{botId}/` → ler `recordings[0].media_shortcuts.transcript.data.download_url`
2. Baixar a transcrição via essa URL

### Correções

**1. Atualizar `recall-webhook/index.ts` — função `handleBotDone`**

Substituir a lógica de fetch de transcrição:
- Em vez de `GET /api/v1/bot/{id}/transcript/`, usar `GET /api/v2/bot/{id}/`
- Extrair `recordings[0].media_shortcuts.transcript.data.download_url`
- Se o status do transcript for `processing`, retornar sem marcar erro (retry no próximo webhook)
- Se `done`, baixar o JSON da `download_url` e processar normalmente
- Remover também o endpoint legado `/api/v1/bot/{id}/speaker_timeline/` — os dados de speaker vêm dentro do transcript download

**2. Criar edge function `reprocess-meeting` para recuperar a reunião da Giovanna**

A edge function já existe (`supabase/functions/reprocess-meeting/index.ts`). Atualizar para usar a mesma lógica v2.

**3. Testar chamando o reprocess para o bot `711862ea-606f-4805-b61f-8b893f89c9d6`**

### Arquivos a modificar
- `supabase/functions/recall-webhook/index.ts` — migrar de v1 para v2
- `supabase/functions/reprocess-meeting/index.ts` — mesma migração

### Resultado esperado
- Próximas reuniões: transcrição baixada automaticamente via API v2
- Reunião da Giovanna: recuperada via reprocess
- Feedback criado no diário de bordo da Giovanna com a transcrição

