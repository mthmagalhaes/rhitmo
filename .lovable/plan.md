

## Plano: Corrigir gravação da Laís + Bugs na pipeline de gravação

### Problema encontrado
A gravação da Laís (transcript `46aa4f8d`) está com status `error`. Investigando:

1. **Bug 1 — Nome do arquivo no Whisper**: A `upload-meeting` sempre envia o arquivo para o Whisper com nome `audio.webm` (linha 120), mesmo quando o arquivo é `.wav` ou `.mp3`. Isso pode causar erro de decodificação na API do Whisper.
2. **Bug 2 — URL pública em bucket privado**: A função salva `getPublicUrl()` no campo `transcript`, mas o bucket `meeting-recordings` é privado. Isso quebra o `reprocess-meeting`, que tenta baixar dessa URL e recebe 404.
3. **Gravação da Laís**: Precisa ser reprocessada após as correções.

### Alterações

**1. `supabase/functions/upload-meeting/index.ts`**
- Linha 120: usar o nome correto do arquivo com a extensão real (`audio.mp3`, `audio.wav`, etc.) ao enviar para o Whisper
- Linha 75-77: salvar o **file path** no campo `transcript` em vez da URL pública (ex: `79a6f679.../1775588344866.wav`), permitindo que o reprocessamento use `createSignedUrl` ou `download` direto

**2. `supabase/functions/reprocess-meeting/index.ts`**
- Alterar o download do áudio: em vez de fazer `fetch(audioUrl)`, usar `supabase.storage.from('meeting-recordings').download(filePath)` com a service role key
- Detectar se o valor salvo é um path ou URL legada, e tratar ambos os casos
- Usar a extensão correta ao enviar para o Whisper

**3. Reprocessar a gravação da Laís**
- Após deploy das correções, chamar `reprocess-meeting` para o transcript `46aa4f8d` para criar o feedback no diário de bordo dela

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/upload-meeting/index.ts` | Corrigir nome do arquivo Whisper + salvar path em vez de URL |
| `supabase/functions/reprocess-meeting/index.ts` | Usar storage download em vez de fetch público + extensão correta |

### Notas técnicas
- Sem alterações no banco de dados
- O campo `transcript` da tabela `meeting_transcripts` é reutilizado: inicialmente guarda o path/URL do áudio, depois é sobrescrito com o texto transcrito. O reprocess precisa lidar com registros que já têm URL legada (começam com `http`)
- A correção é retrocompatível: registros antigos com URL pública continuarão tentando download via fetch como fallback

