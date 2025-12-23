import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export const VoiceInput = ({ onTranscription, disabled = false, className }: VoiceInputProps) => {
  const [state, setState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

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
    
    return 'audio/webm'; // fallback
  };

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      const mimeType = getSupportedMimeType();
      console.log('Using mime type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setState('processing');
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        if (audioBlob.size < 1000) {
          toast({
            title: "Áudio muito curto",
            description: "Por favor, grave por mais tempo.",
            variant: "destructive"
          });
          setState('idle');
          return;
        }
        
        try {
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            // Send to edge function
            const { data, error } = await supabase.functions.invoke('transcribe-audio', {
              body: { 
                audio: base64Audio,
                mimeType: mimeType
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
          };
          
        } catch (error: any) {
          console.error('Transcription error:', error);
          toast({
            title: "Erro na transcrição",
            description: error.message || "Não foi possível transcrever o áudio.",
            variant: "destructive"
          });
          setState('idle');
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      
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
  }, [onTranscription, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const handleClick = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
    // Do nothing if processing
  }, [state, startRecording, stopRecording]);

  const isDisabled = disabled || state === 'processing';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        "h-8 w-8 rounded-full transition-all",
        state === 'recording' && "bg-destructive/10 hover:bg-destructive/20 ring-2 ring-destructive ring-offset-2 animate-pulse",
        state === 'processing' && "opacity-70",
        className
      )}
      aria-label={
        state === 'idle' ? 'Iniciar gravação' :
        state === 'recording' ? 'Parar gravação' :
        'Processando...'
      }
    >
      {state === 'idle' && (
        <Mic className="h-4 w-4 text-muted-foreground" />
      )}
      {state === 'recording' && (
        <MicOff className="h-4 w-4 text-destructive" />
      )}
      {state === 'processing' && (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      )}
    </Button>
  );
};
