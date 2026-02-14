import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Monitor, Square, Loader2, CheckCircle, Mic, MicOff, Radio, AlertTriangle, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MeetingRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId?: string;
  memberName?: string;
}

type RecorderState = 'idle' | 'recording' | 'uploading' | 'done' | 'no-audio-warning';

const AUDIO_THRESHOLD = 0.08; // ~20/255

const WaveformBars = ({
  isActive,
  analyserRef,
  onAudioDetected,
}: {
  isActive: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
  onAudioDetected?: () => void;
}) => {
  const [bars, setBars] = useState<number[]>(Array(16).fill(0.15));
  const animationRef = useRef<number | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    detectedRef.current = false;
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      setBars(Array(16).fill(0.15));
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const updateBars = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const step = Math.floor(dataArray.length / 16);
        const newBars = Array.from({ length: 16 }, (_, i) =>
          Math.max(0.15, dataArray[i * step] / 255)
        );
        setBars(newBars);

        if (!detectedRef.current && onAudioDetected) {
          const hasSound = newBars.some(b => b > AUDIO_THRESHOLD);
          if (hasSound) {
            detectedRef.current = true;
            onAudioDetected();
          }
        }
      }
      animationRef.current = requestAnimationFrame(updateBars);
    };
    updateBars();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, analyserRef, onAudioDetected]);

  return (
    <div className="flex items-center justify-center gap-0.5 h-12">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1.5 bg-primary rounded-full transition-all duration-75"
          style={{ height: `${height * 100}%`, minHeight: '15%' }}
        />
      ))}
    </div>
  );
};

export const MeetingRecorder = ({ open, onOpenChange, memberId, memberName }: MeetingRecorderProps) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [audioDetected, setAudioDetected] = useState(false);
  const [hasMic, setHasMic] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const handleAudioDetected = useCallback(() => {
    setAudioDetected(true);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });

      // Stop video tracks — we only need audio
      stream.getVideoTracks().forEach(track => track.stop());

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        // No audio channel — user forgot the checkbox
        stream.getTracks().forEach(t => t.stop());
        setState('no-audio-warning');
        return;
      }

      // Tab audio stream
      const tabAudioStream = new MediaStream(audioTracks);
      streamRef.current = tabAudioStream;
      chunksRef.current = [];

      // Setup AudioContext with mixer destination
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      // Connect tab audio
      const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
      tabSource.connect(destination);
      tabSource.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Try hybrid capture — add mic
      let micAvailable = false;
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);
        micStreamRef.current = micStream;
        micAvailable = true;
      } catch {
        toast({
          title: 'Microfone não disponível',
          description: 'Gravando apenas áudio da aba.',
        });
      }
      setHasMic(micAvailable);
      setAudioDetected(false);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(destination.stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Auto-stop if user ends sharing via browser UI
      audioTracks[0].onended = () => {
        stopRecording();
      };

      mediaRecorder.start(1000);
      setState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('getDisplayMedia error:', error);
      if (error.name !== 'NotAllowedError') {
        toast({
          title: 'Erro ao iniciar gravação',
          description: error.message || 'Não foi possível capturar o áudio da aba.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setState('uploading');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const mediaRecorder = mediaRecorderRef.current;

    mediaRecorder.onstop = async () => {
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = [];

      if (blob.size < 1000) {
        toast({
          title: 'Gravação muito curta',
          description: 'Grave por mais tempo para gerar conteúdo.',
          variant: 'destructive',
        });
        setState('idle');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', blob, 'meeting-recording.webm');
        if (meetingTitle.trim()) formData.append('meeting_title', meetingTitle.trim());
        if (memberId) formData.append('member_id', memberId);

        const { data, error } = await supabase.functions.invoke('upload-meeting', {
          body: formData,
        });

        if (error) throw error;

        if (data?.success) {
          setTranscriptId(data.transcript_id);
          setState('done');
          toast({
            title: 'Gravação enviada!',
            description: 'O áudio está sendo processado.',
          });
        } else {
          throw new Error(data?.error || 'Falha no upload');
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        toast({
          title: 'Erro no upload',
          description: err.message || 'Não foi possível enviar a gravação.',
          variant: 'destructive',
        });
        setState('idle');
      }
    };

    mediaRecorder.stop();
  }, [meetingTitle, memberId, toast]);

  // Cleanup on dialog close or unmount
  useEffect(() => {
    if (!open) {
      cleanup();
      setState('idle');
      setDuration(0);
      setMeetingTitle('');
      setTranscriptId(null);
      setAudioDetected(false);
      setHasMic(false);
    }
  }, [open, cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (state === 'recording') {
        stopRecording();
        return;
      }
      onOpenChange(v);
    }}>
      <DialogContent className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] max-w-md">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Gravar Reunião</DialogTitle>
          <DialogDescription>
            {memberName
              ? `Captura de áudio da aba para ${memberName}`
              : 'Captura de áudio de uma aba do navegador'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Idle state */}
          {state === 'idle' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">Título da reunião (opcional)</Label>
                <Input
                  id="meeting-title"
                  placeholder="Ex: 1:1 Semanal"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Monitor className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecione a aba do Google Meet (ou outra) e marque <strong>"Compartilhar áudio da aba"</strong>.
                </p>
              </div>

              <Button onClick={startRecording} className="w-full gap-2 rounded-xl" size="lg">
                <Monitor className="h-5 w-5" />
                Iniciar Gravação
              </Button>
            </div>
          )}

          {/* No audio warning state */}
          {state === 'no-audio-warning' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Áudio da aba não detectado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ao compartilhar a aba, marque a caixa <strong>"Compartilhar áudio da aba"</strong> no canto inferior esquerdo da janela de seleção.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Volume2 className="h-8 w-8" />
                  <span className="text-2xl">→</span>
                  <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-xs font-medium">
                    <div className="w-3 h-3 rounded-sm border border-primary bg-primary/20" />
                    Compartilhar áudio
                  </div>
                </div>
              </div>

              <Button onClick={startRecording} className="w-full gap-2 rounded-xl" size="lg">
                <Monitor className="h-5 w-5" />
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Recording state */}
          {state === 'recording' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-muted/50 rounded-2xl p-6 text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-medium text-destructive">Gravando</span>
                </div>
                <p className="text-3xl font-mono font-bold tracking-tight text-foreground">
                  {formatDuration(duration)}
                </p>
                <WaveformBars isActive analyserRef={analyserRef} onAudioDetected={handleAudioDetected} />

                {/* Source indicators */}
                <div className="flex items-center justify-center gap-3">
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Monitor className="h-3 w-3" /> Aba
                  </Badge>
                  <Badge
                    variant={hasMic ? 'secondary' : 'outline'}
                    className={cn('gap-1.5 text-xs', !hasMic && 'opacity-50')}
                  >
                    {hasMic ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                    Mic
                  </Badge>
                </div>

                {/* Connected badge — shows until real audio is detected */}
                {!audioDetected && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground animate-fade-in">
                    <Radio className="h-3.5 w-3.5 text-primary" />
                    <span>Conectado — Capturando som assim que a conversa começar</span>
                  </div>
                )}
              </div>

              <Button
                onClick={stopRecording}
                variant="destructive"
                className="w-full gap-2 rounded-xl"
                size="lg"
              >
                <Square className="h-5 w-5" />
                Parar Gravação
              </Button>
            </div>
          )}

          {/* Uploading state */}
          {state === 'uploading' && (
            <div className="bg-muted/50 rounded-2xl p-8 text-center space-y-4 animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Enviando gravação...</p>
            </div>
          )}

          {/* Done state */}
          {state === 'done' && (
            <div className="bg-muted/50 rounded-2xl p-8 text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Gravação enviada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  O áudio será processado automaticamente.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
