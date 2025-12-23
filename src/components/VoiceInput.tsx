import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Pause, Play, Trash2, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

// Waveform bars component
const WaveformBars = ({ isActive, analyserRef }: { isActive: boolean; analyserRef: React.RefObject<AnalyserNode | null> }) => {
  const [bars, setBars] = useState<number[]>(Array(12).fill(0.15));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setBars(Array(12).fill(0.15));
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const updateBars = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Sample 12 points from the frequency data
        const newBars = [];
        const step = Math.floor(dataArray.length / 12);
        for (let i = 0; i < 12; i++) {
          const value = dataArray[i * step] / 255;
          newBars.push(Math.max(0.15, value));
        }
        setBars(newBars);
      }
      animationRef.current = requestAnimationFrame(updateBars);
    };

    updateBars();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyserRef]);

  return (
    <div className="flex items-center gap-0.5 h-6">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full transition-all duration-75"
          style={{ height: `${height * 100}%`, minHeight: '15%' }}
        />
      ))}
    </div>
  );
};

export const VoiceInput = ({ onTranscription, disabled = false, className }: VoiceInputProps) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const { toast } = useToast();

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine supported mime type
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm';
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setDuration(0);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Setup audio analyser for waveform
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100);
      setState('recording');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      console.error('Microphone error:', error);
      
      let message = "Não foi possível acessar o microfone.";
      if (error.name === 'NotAllowedError') {
        message = "Permissão de microfone negada. Habilite nas configurações do navegador.";
      } else if (error.name === 'NotFoundError') {
        message = "Nenhum microfone encontrado.";
      }
      
      toast({
        title: "Erro de microfone",
        description: message,
        variant: "destructive"
      });
    }
  }, [toast]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState('paused');
    }
  }, [state]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      setState('recording');
    }
  }, [state]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    cleanup();
    setState('idle');
  }, [cleanup]);

  // Send for transcription
  const sendRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    
    setState('processing');
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop recording and get blob
    const mediaRecorder = mediaRecorderRef.current;
    
    mediaRecorder.onstop = async () => {
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      
      const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      
      if (audioBlob.size < 1000) {
        toast({
          title: "Áudio muito curto",
          description: "Por favor, grave por mais tempo.",
          variant: "destructive"
        });
        setState('idle');
        setDuration(0);
        chunksRef.current = [];
        return;
      }
      
      try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { 
              audio: base64Audio,
              mimeType: mimeTypeRef.current
            }
          });
          
          if (error) throw error;
          
          if (data?.text) {
            onTranscription(data.text);
            toast({
              title: "Transcrição concluída!",
              description: "Texto adicionado com sucesso.",
            });
          } else {
            throw new Error('Nenhum texto transcrito');
          }
          
          setState('idle');
          setDuration(0);
          chunksRef.current = [];
        };
        
      } catch (error: any) {
        console.error('Transcription error:', error);
        toast({
          title: "Erro na transcrição",
          description: error.message || "Não foi possível transcrever o áudio.",
          variant: "destructive"
        });
        setState('idle');
        setDuration(0);
        chunksRef.current = [];
      }
    };
    
    mediaRecorder.stop();
  }, [onTranscription, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const isDisabled = disabled || state === 'processing';
  const isRecordingOrPaused = state === 'recording' || state === 'paused';

  // Idle state - just the mic button
  if (state === 'idle') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={startRecording}
        disabled={isDisabled}
        className={cn("h-8 w-8 rounded-full transition-all hover:bg-primary/10", className)}
        aria-label="Iniciar gravação"
      >
        <Mic className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  // Processing state
  if (state === 'processing') {
    return (
      <div className={cn(
        "flex items-center gap-2 bg-muted rounded-full px-3 py-1.5",
        className
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Transcrevendo...</span>
      </div>
    );
  }

  // Recording/Paused state - expanded bar
  return (
    <div className={cn(
      "flex items-center gap-2 bg-muted rounded-full px-2 py-1 animate-fade-in",
      className
    )}>
      {/* Cancel button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={cancelRecording}
        className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label="Cancelar gravação"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Recording indicator + timer */}
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "h-2 w-2 rounded-full",
          state === 'recording' ? "bg-destructive animate-pulse" : "bg-muted-foreground"
        )} />
        <span className="text-xs font-mono text-muted-foreground min-w-[32px]">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Waveform */}
      <div className="flex-1 min-w-[60px] max-w-[100px]">
        <WaveformBars isActive={state === 'recording'} analyserRef={analyserRef} />
      </div>

      {/* Pause/Play button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={state === 'recording' ? pauseRecording : resumeRecording}
        className="h-7 w-7 rounded-full hover:bg-background"
        aria-label={state === 'recording' ? 'Pausar gravação' : 'Continuar gravação'}
      >
        {state === 'recording' ? (
          <Pause className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Play className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      {/* Send button */}
      <Button
        type="button"
        variant="default"
        size="icon"
        onClick={sendRecording}
        className="h-7 w-7 rounded-full"
        aria-label="Enviar gravação"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
