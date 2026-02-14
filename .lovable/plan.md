
## Plano: MeetingRecorder Resiliente com Captura Hibrida e Deteccao Inteligente

### Resumo das Melhorias

Tornar o gravador mais robusto para cenarios reais de reuniao, distinguindo "silencio normal" de "audio nao compartilhado", adicionando captura hibrida (aba + microfone), e dando feedback visual claro ao lider.

---

### 1. Deteccao de Canal vs. Volume (Nao confundir silencio com erro)

**Problema atual:** Se o usuario marca "Compartilhar audio" mas a reuniao esta em silencio, o componente pode parecer "morto".

**Solucao:**
- Manter a logica atual que verifica `audioTracks.length === 0` para detectar ausencia real de canal de audio (checkbox nao marcado)
- Nunca dar erro por volume zero -- silencio e normal (lider mutado, reuniao nao comecou)
- Adicionar um estado `hasAudioChannel` (boolean) que e `true` quando existem audio tracks, independente do volume

### 2. Indicador "Pronto para Gravar"

**Novo estado visual** no modo `recording`:
- Quando `hasAudioChannel === true`, exibir uma badge discreta: "Conectado -- Capturando som da aba assim que a conversa comecar"
- Usar icone `Wifi` ou `Radio` verde ao lado do indicador de gravacao
- Essa mensagem aparece nos primeiros segundos ou enquanto o volume estiver em zero, e desaparece quando detecta som real (barras do waveform se movem)

**Implementacao:**
- Novo state: `audioDetected` (boolean) -- muda para `true` quando o analyser detecta volume acima de um threshold (ex: qualquer barra > 0.2)
- Enquanto `audioDetected === false` e `state === 'recording'`, mostrar a badge de "Conectado"

### 3. Captura Hibrida (Aba + Microfone)

**Objetivo:** Gravar tanto o som da aba (o que o lider ouve) quanto o microfone do lider (o que ele fala), misturando em uma unica faixa.

**Fluxo tecnico:**
```text
1. getDisplayMedia({ audio: true, video: true }) -> tabStream
2. getUserMedia({ audio: true }) -> micStream  
3. Criar AudioContext
4. Conectar ambos como MediaStreamSource
5. Usar createMediaStreamDestination() para mixar em uma saida
6. Gravar a saida mixada com MediaRecorder
```

**Tratamento de falhas:**
- Se o microfone falhar (usuario nega permissao), continuar apenas com audio da aba -- nao bloquear a gravacao
- Exibir toast informativo: "Microfone nao disponivel. Gravando apenas audio da aba."
- Novo state `hasMic` (boolean) para indicar no UI se o microfone esta ativo

**UI durante gravacao:**
- Mostrar dois indicadores discretos:
  - `Monitor` icon + "Aba" (sempre presente se audio da aba conectado)
  - `Mic` icon + "Mic" (presente se microfone ativo, cinza se nao)

### 4. Aviso Visual de "Audio Nao Compartilhado"

**Cenario:** Usuario compartilhou a aba mas NAO marcou "Compartilhar audio da aba".

**Deteccao:** `stream.getAudioTracks().length === 0` apos getDisplayMedia (ja implementado).

**Melhoria:** Em vez de apenas um toast que desaparece, exibir um **estado visual persistente** no dialog antes de voltar ao idle:

- Novo estado intermediario: `'no-audio-warning'`
- Card grande com:
  - Icone `AlertTriangle` em amarelo/amber
  - Titulo: "Audio da aba nao detectado"
  - Descricao com instrucoes claras: "Ao compartilhar a aba, marque a caixa 'Compartilhar audio da aba' no canto inferior esquerdo da janela de selecao."
  - Ilustracao: icone `MonitorSpeaker` ou `Volume2` com seta visual
  - Botao "Tentar Novamente" que chama `startRecording()` de novo

### Detalhes Tecnicos

**Arquivo editado:** `src/components/MeetingRecorder.tsx`

**Novos states:**
```typescript
type RecorderState = 'idle' | 'recording' | 'uploading' | 'done' | 'no-audio-warning';

// Novos states internos:
const [hasAudioChannel, setHasAudioChannel] = useState(false);
const [audioDetected, setAudioDetected] = useState(false);
const [hasMic, setHasMic] = useState(false);
```

**Novo ref para mic stream:**
```typescript
const micStreamRef = useRef<MediaStream | null>(null);
```

**Logica de mixagem de audio (captura hibrida):**
```typescript
const audioContext = new AudioContext();
const destination = audioContext.createMediaStreamDestination();

// Tab audio source
const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
tabSource.connect(destination);

// Mic audio source (optional)
try {
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const micSource = audioContext.createMediaStreamSource(micStream);
  micSource.connect(destination);
  micStreamRef.current = micStream;
  setHasMic(true);
} catch {
  // Mic not available, continue with tab-only
  setHasMic(false);
}

// Connect analyser to mixed output
const analyser = audioContext.createAnalyser();
tabSource.connect(analyser); // or destination

// Record the mixed output
const mediaRecorder = new MediaRecorder(destination.stream, { mimeType });
```

**Deteccao de volume real (para badge "Conectado"):**
- No loop do `WaveformBars`, reportar se alguma barra ultrapassou threshold
- Alternativamente, verificar no intervalo do timer se o analyser tem dados acima de ~5/255
- Callback `onAudioDetected` passado ao WaveformBars ou verificado diretamente no componente pai

**Cleanup atualizado:**
- Adicionar `micStreamRef` ao cleanup para parar tracks do microfone

**Nenhuma alteracao no backend** -- a edge function `upload-meeting` ja aceita o blob de audio normalmente.
