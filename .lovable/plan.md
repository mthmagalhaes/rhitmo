

## Gravacao de Reuniao: Compressao MP3 + Reprocessamento

### Visao Geral
Tres mudancas: (1) converter audio para MP3 32kbps antes do upload no frontend, (2) criar Edge Function para reprocessar gravacoes com erro, (3) tratar o registro do Matheus.

---

### 1. Migracao de banco: adicionar coluna `error_message`

A tabela `meeting_transcripts` nao possui `error_message`. Precisamos adiciona-la para persistir razoes de erro.

```sql
ALTER TABLE public.meeting_transcripts
ADD COLUMN IF NOT EXISTS error_message text;
```

---

### 2. Instalar `lamejs` (dependencia npm)

Adicionar `lamejs` para codificacao MP3 no browser. Nao existe `@types/lamejs` oficial, entao criaremos uma declaracao de tipo minima.

- `npm install lamejs`
- Criar `src/types/lamejs.d.ts` com declaracao basica do `Mp3Encoder`

---

### 3. MeetingRecorder.tsx — Conversao MP3 antes do upload

**Novo tipo de estado:**
```text
'idle' | 'recording' | 'converting' | 'uploading' | 'done' | 'no-audio-warning'
```

**Novo fluxo no `stopRecording`:**
1. Estado muda para `'converting'` (UI mostra "Processando audio...")
2. Chama `convertToMp3(blob)`:
   - Decodifica webm via `AudioContext.decodeAudioData`
   - Renderiza em mono 16kHz via `OfflineAudioContext`
   - Codifica MP3 32kbps via lamejs `Mp3Encoder`
   - Fallback: se lamejs falhar, gera WAV com sample rate baixo
3. Estado muda para `'uploading'`
4. Upload do blob MP3 com filename `meeting-{timestamp}.mp3` e contentType `audio/mpeg`

**Nova UI para estado `converting`:**
- Spinner + "Processando audio... isso pode levar alguns segundos para reunioes longas."

**Mudanca no upload-meeting Edge Function:**
- O `filePath` no storage usara a extensao vinda do arquivo (`.mp3` ou `.wav`), nao mais `.webm` hardcoded
- Ajustar o contentType para usar `file.type` (ja faz isso com fallback)

Impacto: Apenas `upload-meeting/index.ts` precisa de ajuste minimo na extensao do arquivo (trocar `.webm` hardcoded para derivar da extensao do arquivo enviado).

---

### 4. Edge Function: `reprocess-meeting/index.ts` (nova)

**Input:** `{ transcriptId: string }`

**Fluxo:**
1. Autenticar usuario via header Authorization
2. Buscar registro em `meeting_transcripts` pelo `transcriptId`
3. Validar: `processing_status` deve ser `'error'`; rejeitar se `'completed'`
4. O campo `transcript` contem a URL do arquivo no Storage
5. Fazer download do arquivo via fetch da URL publica
6. Verificar tamanho: se > 20MB, retornar erro com mensagem amigavel
7. Se <= 20MB: enviar ao Whisper, seguir fluxo identico ao `upload-meeting` (atualizar transcript, criar feedback, trigger classify-note e analyze-feedback-background)
8. Atualizar `processing_status` para `'completed'` ou manter `'error'` com `error_message`

**Config:** Adicionar ao `supabase/config.toml`:
```toml
[functions.reprocess-meeting]
verify_jwt = true
```

---

### 5. Tratar o registro do Matheus (inline na Edge Function)

Apos deploy, invocar `reprocess-meeting` com `transcriptId: '844e0996-...'`. Como o arquivo original e um .webm de ~1h de reuniao (provavelmente > 20MB), a funcao ira:
- Detectar que excede o limite
- Atualizar o registro com `error_message: 'Arquivo .webm original excede limite do Whisper. Nova gravacao sera comprimida automaticamente.'`
- Retornar resposta informativa

Nao sera possivel reprocessar retroativamente — o .webm original nao pode ser comprimido no servidor.

---

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| `src/components/MeetingRecorder.tsx` | Adicionar estado `converting`, funcao `convertToMp3`, ajustar extensao/mime no upload |
| `src/types/lamejs.d.ts` | Criar declaracao de tipos para lamejs |
| `supabase/functions/reprocess-meeting/index.ts` | Criar nova Edge Function |
| `supabase/functions/upload-meeting/index.ts` | Ajuste minimo: extensao dinamica no filePath |
| Migracao SQL | Adicionar coluna `error_message` |
| `package.json` | Adicionar `lamejs` |

### O que NAO muda
- Nenhum outro componente de UI
- Demais Edge Functions
- Schema da tabela (exceto `error_message`)

