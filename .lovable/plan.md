

## Plano: Gravador de Reuniao com Captura de Audio de Aba

### Contexto

Substituir a extensao do Chrome por um componente nativo que usa `getDisplayMedia` para capturar audio de abas do navegador (ex: Google Meet) e fazer upload para o storage + tabela `meeting_transcripts`.

### Componente: `MeetingRecorder`

Criar `src/components/MeetingRecorder.tsx` -- um card/dialog estilo Bento com:

**Estados:**
- `idle` -- Botao "Iniciar Gravacao"
- `recording` -- Timer, waveform, botao "Parar"
- `uploading` -- Spinner + progresso
- `done` -- Confirmacao com ID do transcript

**Fluxo tecnico:**

```text
1. Usuario clica "Iniciar Gravacao"
2. Chama navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
   - video:true e obrigatorio para getDisplayMedia, mas descartamos a faixa de video
   - O browser exibe o picker de compartilhamento de aba com checkbox "Compartilhar audio"
3. Extraimos APENAS as audio tracks do stream
4. Criamos MediaRecorder com as audio tracks
5. Gravacao em andamento com timer e waveform visual
6. Usuario clica "Parar"
7. Blob de audio e criado
8. Upload via FormData para edge function `upload-meeting` (ja configurada)
9. Edge function salva no storage e cria registro em meeting_transcripts
10. Exibe confirmacao
```

**Campos opcionais no UI:**
- Titulo da reuniao (input de texto)
- Selector de membro (se o usuario quiser associar a um team_member)

### Onde colocar na interface

Adicionar na pagina `MemberDetails.tsx` como um botao/acao ao lado de "Nova Anotacao", e tambem disponibilizar como um Dialog acessivel pelo sidebar ou dashboard.

Criar uma rota dedicada nao e necessario -- sera um Dialog/Sheet reutilizavel.

### Detalhes Tecnicos

**1. Novo arquivo: `src/components/MeetingRecorder.tsx`**

- Usa `navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })`
- Descarta video tracks imediatamente: `stream.getVideoTracks().forEach(t => t.stop())`
- Verifica se ha audio tracks: se nao houver, exibe toast pedindo para marcar "Compartilhar audio da aba"
- MediaRecorder grava apenas audio
- AudioContext + AnalyserNode para waveform visual (reutiliza padrao do VoiceInput)
- Upload via `supabase.functions.invoke('upload-meeting')` com FormData contendo:
  - `file`: Blob do audio
  - `meeting_title`: titulo opcional
  - `member_id`: membro opcional
- Timer formatado MM:SS
- Cleanup completo no unmount (stop tracks, close AudioContext)

**2. Editar `src/pages/MemberDetails.tsx`**

- Importar MeetingRecorder
- Adicionar botao "Gravar Reuniao" ao lado de "Nova Anotacao" e "Mentor Chat"
- Botao abre o MeetingRecorder como Dialog

**3. Edge Function `upload-meeting`**

- Ja esta configurada para aceitar FormData com auth opcional
- Nenhuma alteracao necessaria

**4. Consideracoes do `getDisplayMedia`**

- `getDisplayMedia` requer interacao do usuario (nao pode ser chamado automaticamente)
- O parametro `{ audio: true }` habilita a opcao de compartilhar audio da aba
- Em alguns browsers, o usuario precisa **marcar manualmente** o checkbox "Compartilhar audio da aba"
- Se o usuario compartilhar apenas video sem audio, o componente deve detectar e avisar
- Compatibilidade: Chrome 74+, Edge 79+, Firefox 66+ (Firefox tem suporte limitado a audio de aba)

### Visual (Design System Creme/Bento)

- Card com `rounded-2xl` e shadow suave
- Botao principal com variante `default` (primary)
- Timer com `font-mono`
- Waveform reutilizando o componente `WaveformBars` do VoiceInput
- Estados com transicoes suaves (`animate-fade-in`)
- Icones: `Monitor` (idle), `Square` (parar), `Loader2` (uploading), `CheckCircle` (done)

