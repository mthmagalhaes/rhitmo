import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Square, Loader2, CheckCircle, Mic, MicOff, Radio, AlertTriangle, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type RecorderState = 'selecting' | 'recording' | 'converting' | 'uploading' | 'done' | 'error' | 'no-audio';

const AUDIO_THRESHOLD = 0.08;
const CHANNEL_NAME = 'rhitmo-recorder';

// --- Audio helpers (same as MeetingRecorder) ---

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const samples = buffer.getChannelData(0);
  const bytesPerSample = 2;
  const blockAlign = 1 * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const v = new DataView(ab);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE');
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, buffer.sampleRate, true);
  v.setUint32(28, buffer.sampleRate * blockAlign, true); v.setUint16(32, blockAlign, true);
  v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return ab;
}

async function convertToMp3(webmBlob: Blob): Promise<{ blob: Blob; extension: string }> {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();

  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();

  try {
    const lamejs = await import('lamejs');
    const enc = new lamejs.Mp3Encoder(1, targetSampleRate, 32);
    const samples = rendered.getChannelData(0);
    const int16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) int16[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
    const parts: Int16Array[] = [];
    for (let i = 0; i < int16.length; i += 1152) {
      const encoded = enc.encodeBuffer(int16.subarray(i, i + 1152));
      if (encoded.length > 0) parts.push(encoded);
    }
    const flush = enc.flush();
    if (flush.length > 0) parts.push(flush);
    const total = parts.reduce((a, p) => a + p.length, 0);
    const result = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { result.set(new Uint8Array(p.buffer, p.byteOffset, p.byteLength), o); o += p.byteLength; }
    return { blob: new Blob([result], { type: 'audio/mpeg' }), extension: 'mp3' };
  } catch {
    let buf = rendered;
    if (rendered.length * 2 > 20 * 1024 * 1024) {
      const ds = new OfflineAudioContext(1, Math.ceil(rendered.duration * 8000), 8000);
      const s = ds.createBufferSource(); s.buffer = rendered; s.connect(ds.destination); s.start();
      buf = await ds.startRendering();
    }
    return { blob: new Blob([audioBufferToWav(buf)], { type: 'audio/wav' }), extension: 'wav' };
  }
}

// --- Waveform ---

const WaveformBars = ({ isActive, analyserRef, onAudioDetected }: {
  isActive: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
  onAudioDetected?: () => void;
}) => {
  const [bars, setBars] = useState<number[]>(Array(16).fill(0.15));
  const animRef = useRef<number | null>(null);
  const detected = useRef(false);

  useEffect(() => { detected.current = false; }, [isActive]);

  useEffect(() => {
    if (!isActive) { setBars(Array(16).fill(0.15)); if (animRef.current) cancelAnimationFrame(animRef.current); return; }
    const update = () => {
      if (analyserRef.current) {
        const d = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(d);
        const step = Math.floor(d.length / 16);
        const nb = Array.from({ length: 16 }, (_, i) => Math.max(0.15, d[i * step] / 255));
        setBars(nb);
        if (!detected.current && onAudioDetected && nb.some(b => b > AUDIO_THRESHOLD)) { detected.current = true; onAudioDetected(); }
      }
      animRef.current = requestAnimationFrame(update);
    };
    update();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isActive, analyserRef, onAudioDetected]);

  return (
    <div className="flex items-center justify-center gap-0.5 h-12">
      {bars.map((h, i) => (
        <div key={i} className="w-1.5 bg-primary rounded-full transition-all duration-75" style={{ height: `${h * 100}%`, minHeight: '15%' }} />
      ))}
    </div>
  );
};

// --- Main Popup ---

export default function RecorderPopup() {
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('memberId') || '';
  const memberName = params.get('memberName') || '';
  const meetingTitle = params.get('title') || '';

  const [state, setState] = useState<RecorderState>('selecting');
  const [duration, setDuration] = useState(0);
  const [audioDetected, setAudioDetected] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Setup BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    // Notify parent we're alive
    channelRef.current.postMessage({ type: 'popup-ready' });
    return () => { channelRef.current?.close(); };
  }, []);

  // Beforeunload protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state === 'recording' || state === 'converting' || state === 'uploading') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  // Send status updates to parent
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'status', state, duration });
  }, [state, duration]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    audioContextRef.current = null; analyserRef.current = null;
    mediaRecorderRef.current = null; chunksRef.current = [];
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    setState('converting');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const mr = mediaRecorderRef.current;
    mr.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
      micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
      audioContextRef.current = null; analyserRef.current = null;

      const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = [];

      if (webmBlob.size < 1000) {
        setErrorMsg('Gravação muito curta. Grave por mais tempo.');
        setState('error');
        return;
      }

      let convertedBlob: Blob;
      let fileName: string;
      try {
        const result = await convertToMp3(webmBlob);
        convertedBlob = result.blob;
        fileName = `meeting-${Date.now()}.${result.extension}`;
      } catch {
        convertedBlob = webmBlob;
        fileName = `meeting-${Date.now()}.webm`;
      }

      setState('uploading');

      try {
        const formData = new FormData();
        formData.append('file', convertedBlob, fileName);
        if (meetingTitle.trim()) formData.append('meeting_title', meetingTitle.trim());
        if (memberId) formData.append('member_id', memberId);

        const { data, error } = await supabase.functions.invoke('upload-meeting', { body: formData });
        if (error) throw error;

        if (data?.success) {
          channelRef.current?.postMessage({
            type: 'done',
            transcript_id: data.transcript_id,
            feedback_id: data.feedback_id || null,
            feedback_content: data.feedback_content || null,
            feedback_title: meetingTitle.trim() || null,
            transcribed: data.transcribed,
          });
          setState('done');
        } else {
          throw new Error(data?.error || 'Upload falhou');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro no upload');
        setState('error');
      }
    };
    mr.stop();
  }, [meetingTitle, memberId]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      stream.getVideoTracks().forEach(t => t.stop());

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        setState('no-audio');
        return;
      }

      const tabStream = new MediaStream(audioTracks);
      streamRef.current = tabStream;
      chunksRef.current = [];

      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const tabSrc = ctx.createMediaStreamSource(tabStream);
      tabSrc.connect(dest);
      tabSrc.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      let micOk = false;
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx.createMediaStreamSource(micStream).connect(dest);
        micStreamRef.current = micStream;
        micOk = true;
      } catch {}
      setHasMic(micOk);
      setAudioDetected(false);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(dest.stream, { mimeType });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      audioTracks[0].onended = () => stopRecording();

      mr.start(1000);
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(p => p + 1), 1000);
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setErrorMsg(err.message || 'Erro ao capturar áudio');
        setState('error');
      }
    }
  }, [stopRecording]);

  // Auto-start: request display media immediately
  useEffect(() => {
    startRecording();
    return () => cleanup();
  }, []);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Gravação Rhitmo</h1>
          {memberName && <p className="text-sm text-muted-foreground">{memberName}</p>}
          {meetingTitle && <p className="text-xs text-muted-foreground italic">{meetingTitle}</p>}
        </div>

        {/* Selecting / initial */}
        {state === 'selecting' && (
          <div className="bg-muted/50 rounded-2xl p-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Selecione a aba e marque "Compartilhar áudio"...</p>
          </div>
        )}

        {/* No audio */}
        {state === 'no-audio' && (
          <div className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="font-semibold text-foreground text-sm">Áudio da aba não detectado</p>
              <p className="text-xs text-muted-foreground">Marque <strong>"Compartilhar áudio da aba"</strong> ao selecionar.</p>
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <Volume2 className="h-6 w-6" />
                <span>→</span>
                <div className="flex items-center gap-1.5 border border-border rounded-lg px-2 py-1 text-xs font-medium">
                  <div className="w-3 h-3 rounded-sm border border-primary bg-primary/20" />
                  Compartilhar áudio
                </div>
              </div>
            </div>
            <Button onClick={startRecording} className="w-full rounded-xl gap-2" size="lg">
              <Monitor className="h-5 w-5" /> Tentar Novamente
            </Button>
          </div>
        )}

        {/* Recording */}
        {state === 'recording' && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-2xl p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">Gravando</span>
              </div>
              <p className="text-4xl font-mono font-bold tracking-tight text-foreground">{formatDuration(duration)}</p>
              <WaveformBars isActive analyserRef={analyserRef} onAudioDetected={() => setAudioDetected(true)} />
              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="gap-1.5 text-xs"><Monitor className="h-3 w-3" /> Aba</Badge>
                <Badge variant={hasMic ? 'secondary' : 'outline'} className={cn('gap-1.5 text-xs', !hasMic && 'opacity-50')}>
                  {hasMic ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />} Mic
                </Badge>
              </div>
              {!audioDetected && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Radio className="h-3.5 w-3.5 text-primary" />
                  <span>Conectado — Capturando som assim que a conversa começar</span>
                </div>
              )}
            </div>
            <Button onClick={stopRecording} variant="destructive" className="w-full gap-2 rounded-xl" size="lg">
              <Square className="h-5 w-5" /> Parar Gravação
            </Button>
          </div>
        )}

        {/* Converting */}
        {state === 'converting' && (
          <div className="bg-muted/50 rounded-2xl p-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium">Processando áudio...</p>
            <p className="text-xs text-muted-foreground">Pode levar alguns segundos.</p>
          </div>
        )}

        {/* Uploading */}
        {state === 'uploading' && (
          <div className="bg-muted/50 rounded-2xl p-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Enviando gravação...</p>
          </div>
        )}

        {/* Done */}
        {state === 'done' && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle className="h-10 w-10 text-primary mx-auto" />
              <p className="font-semibold text-foreground">Transcrição salva!</p>
              <p className="text-sm text-muted-foreground">Você pode fechar esta janela.</p>
            </div>
            <Button variant="outline" onClick={() => window.close()} className="w-full rounded-xl">
              Fechar Janela
            </Button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="font-semibold text-foreground text-sm">Erro na gravação</p>
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
            </div>
            <Button onClick={startRecording} className="w-full rounded-xl gap-2" size="lg">
              <Monitor className="h-5 w-5" /> Tentar Novamente
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Não feche esta janela durante a gravação.
        </p>
      </div>
    </div>
  );
}
