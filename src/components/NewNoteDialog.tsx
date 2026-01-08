import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Paperclip, Mic, Loader2, Upload, X, FileText, Trash2, Pause, Play, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractTextFromFile, isFileSupported } from '@/lib/fileParser';

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMemberId?: string;
  memberName?: string;
  onSuccess?: () => void;
  workspaceId?: string;
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
    <div className="flex items-center gap-0.5 h-5">
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

export const NewNoteDialog = ({ open, onOpenChange, selectedMemberId, memberName, onSuccess, workspaceId }: NewNoteDialogProps) => {
  const [content, setContent] = useState('');
  const [memberId, setMemberId] = useState(selectedMemberId || '');
  const [loading, setLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string } | null>(null);
  
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup recording
  const cleanupRecording = useCallback(() => {
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
    setRecordingDuration(0);
  }, []);

  // Carregar membros quando o dialog abre
  useEffect(() => {
    if (open && !selectedMemberId && workspaceId) {
      loadTeamMembers();
    }
  }, [open, selectedMemberId, workspaceId]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      cleanupRecording();
      setRecordingState('idle');
    }
  }, [open, cleanupRecording]);

  const loadTeamMembers = async () => {
    if (!workspaceId) return;
    
    const { data } = await supabase
      .from('team_members')
      .select('id, name, teams!inner(workspace_id)')
      .eq('teams.workspace_id', workspaceId)
      .order('name');
    
    if (data) {
      setTeamMembers(data);
    }
  };

  // Get supported mime type
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
      setRecordingState('recording');
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
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
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingState('paused');
    }
  }, [recordingState]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingState('recording');
    }
  }, [recordingState]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    cleanupRecording();
    setRecordingState('idle');
  }, [cleanupRecording]);

  // Send recording for transcription
  const sendRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    
    setRecordingState('processing');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const mediaRecorder = mediaRecorderRef.current;
    
    mediaRecorder.onstop = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
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
        setRecordingState('idle');
        setRecordingDuration(0);
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
            setContent(prev => prev + (prev ? '\n' : '') + data.text);
            toast({
              title: "Transcrição concluída!",
              description: "Texto adicionado com sucesso.",
            });
          } else {
            throw new Error('Nenhum texto transcrito');
          }
          
          setRecordingState('idle');
          setRecordingDuration(0);
          chunksRef.current = [];
        };
        
      } catch (error: any) {
        console.error('Transcription error:', error);
        toast({
          title: "Erro na transcrição",
          description: error.message || "Não foi possível transcrever o áudio.",
          variant: "destructive"
        });
        setRecordingState('idle');
        setRecordingDuration(0);
        chunksRef.current = [];
      }
    };
    
    mediaRecorder.stop();
  }, [toast]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!isFileSupported(file)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie arquivos PDF, Word, TXT, Markdown ou imagens (PNG, JPG, WebP).",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingFile(true);
    setAttachedFile({ name: file.name, type: file.type });

    try {
      const extractedText = await extractTextFromFile(file);
      setContent(extractedText);
      toast({
        title: "Arquivo processado!",
        description: `Texto extraído de ${file.name}`,
      });
    } catch (error: any) {
      console.error('Error extracting text:', error);
      setAttachedFile(null);
      
      // Specific message for OCR errors
      let description = error.message;
      if (error.message?.includes('OCR') || error.message?.includes('Falha')) {
        description = 'Não foi possível extrair texto desta imagem. Verifique se contém texto legível.';
      } else if (error.message?.includes('texto detectado')) {
        description = 'Nenhum texto encontrado na imagem. Tente uma imagem com texto visível.';
      }
      
      toast({
        title: "Erro ao processar arquivo",
        description,
        variant: "destructive"
      });
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, adicione o conteúdo da nota.",
        variant: "destructive"
      });
      return;
    }

    const targetMemberId = selectedMemberId || memberId;
    if (!targetMemberId) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um liderado.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Você precisa estar logado');
      }

      const { data: feedback, error: insertError } = await supabase
        .from('feedbacks')
        .insert({
          manager_id: user.id,
          member_id: targetMemberId,
          content: content.trim(),
          type: 'neutral',
          summary: null,
          sentiment: null,
          coaching_tips: null,
          bias_alert: null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Nota salva! ✓",
        description: "Processando análise inteligente...",
      });
      
      setContent('');
      setMemberId('');
      setAttachedFile(null);
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }

      supabase.functions.invoke('analyze-feedback-background', {
        body: { feedbackId: feedback.id }
      }).catch(err => {
        console.error('Background analysis failed:', err);
      });

    } catch (error: any) {
      console.error('Error creating feedback:', error);
      toast({
        title: "Erro ao adicionar nota",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isRecording = recordingState === 'recording' || recordingState === 'paused';
  const isTranscribing = recordingState === 'processing';
  const isDisabled = loading || isProcessingFile || isRecording || isTranscribing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[540px] p-0 overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-lg">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-primary font-medium">Solte para anexar</p>
            </div>
          </div>
        )}

        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Novo Registro
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Member selector - only if not pre-selected */}
            {!selectedMemberId && (
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um liderado" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Clean textarea */}
            <Textarea
              placeholder="Escreva uma observação, cole um texto ou registre um fato..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={cn(
                "min-h-[150px] resize-none border-0 bg-muted/30 rounded-lg",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "text-base placeholder:text-muted-foreground/60 p-3"
              )}
              disabled={isDisabled}
            />

            {/* Attached file badge */}
            {attachedFile && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 pl-2 pr-1 py-1.5">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[200px] truncate text-xs">{attachedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-destructive/20 rounded-full p-0"
                    onClick={removeAttachment}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar footer */}
        <div className="flex items-center justify-between bg-muted/30 px-4 py-3 mt-4">
          {/* Left side - Actions or Recording bar */}
          {!isRecording && !isTranscribing ? (
            <div className="flex items-center gap-1">
              {/* Attach button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isProcessingFile}
                className="text-muted-foreground hover:text-foreground gap-1.5 h-8"
              >
                {isProcessingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <span className="hidden sm:inline text-xs">Anexar</span>
              </Button>
              
              {/* Record button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={startRecording}
                disabled={loading || isProcessingFile}
                className="text-muted-foreground hover:text-foreground gap-1.5 h-8"
              >
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Gravar</span>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          ) : isTranscribing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Transcrevendo...</span>
            </div>
          ) : (
            /* Recording bar */
            <div className="flex items-center gap-2 flex-1">
              {/* Cancel */}
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              {/* Recording indicator + timer */}
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  recordingState === 'recording' ? "bg-destructive animate-pulse" : "bg-muted-foreground"
                )} />
                <span className="text-xs font-mono text-muted-foreground min-w-[32px]">
                  {formatDuration(recordingDuration)}
                </span>
              </div>

              {/* Waveform */}
              <div className="flex-1 min-w-[60px] max-w-[100px]">
                <WaveformBars isActive={recordingState === 'recording'} analyserRef={analyserRef} />
              </div>

              {/* Pause/Play */}
              <Button
                variant="ghost"
                size="icon"
                onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
                className="h-7 w-7 rounded-full hover:bg-background"
              >
                {recordingState === 'recording' ? (
                  <Pause className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Play className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>

              {/* Send recording */}
              <Button
                size="sm"
                onClick={sendRecording}
                className="h-7 gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs">Enviar</span>
              </Button>
            </div>
          )}

          {/* Right side - Submit (hidden during recording) */}
          {!isRecording && !isTranscribing && (
            <Button 
              onClick={handleSubmit} 
              disabled={loading || isProcessingFile || !content.trim()}
              size="sm"
              className="h-8"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Salvar Nota
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
