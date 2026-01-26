import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Square, Pause, Play, Trash2, CheckCircle } from 'lucide-react';
import { useMeetingRecorder, MeetingRecorderData } from '@/hooks/useMeetingRecorder';
import { cn } from '@/lib/utils';

interface MeetingRecorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberId: string;
  onComplete: (data: MeetingRecorderData) => void;
}

// Waveform component
const MeetingWaveform = ({ isActive, analyserRef }: { isActive: boolean; analyserRef: React.RefObject<AnalyserNode | null> }) => {
  const [bars, setBars] = useState<number[]>(Array(24).fill(0.15));

  useEffect(() => {
    if (!isActive) {
      setBars(Array(24).fill(0.15));
      return;
    }

    let animationId: number;
    
    const updateBars = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const newBars = [];
        const step = Math.floor(dataArray.length / 24);
        for (let i = 0; i < 24; i++) {
          const value = dataArray[i * step] / 255;
          newBars.push(Math.max(0.15, value));
        }
        setBars(newBars);
      }
      animationId = requestAnimationFrame(updateBars);
    };

    updateBars();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, analyserRef]);

  return (
    <div className="flex items-center justify-center gap-0.5 h-16 w-full">
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

export const MeetingRecorderDialog = ({
  open,
  onOpenChange,
  memberName,
  memberId,
  onComplete,
}: MeetingRecorderDialogProps) => {
  const {
    state,
    duration,
    currentChunk,
    totalChunks,
    leaderNotes,
    setLeaderNotes,
    analyserRef,
    formatDuration,
    maxDuration,
    startRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    stopRecording,
    reset,
  } = useMeetingRecorder();

  const handleStart = () => {
    startRecording();
  };

  const handleFinish = async () => {
    const data = await stopRecording();
    onComplete(data);
    reset();
    onOpenChange(false);
  };

  const handleCancel = () => {
    cancelRecording();
    onOpenChange(false);
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && state !== 'idle' && state !== 'processing') {
      // Confirm before closing during recording
      if (window.confirm('Deseja cancelar a gravação?')) {
        cancelRecording();
        onOpenChange(false);
      }
    } else if (state === 'idle') {
      onOpenChange(newOpen);
    }
  };

  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isProcessing = state === 'processing';
  const progress = (duration / maxDuration) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Reunião com {memberName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recording state */}
          {state === 'idle' ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Grave sua 1:1 com {memberName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Máximo: {formatDuration(maxDuration)}
                </p>
              </div>
              <Button onClick={handleStart} className="gap-2">
                <Mic className="h-4 w-4" />
                Iniciar Gravação
              </Button>
            </div>
          ) : (
            <>
              {/* Waveform + Timer */}
              <div className="bg-muted rounded-lg p-4">
                <MeetingWaveform isActive={isRecording} analyserRef={analyserRef} />
                
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    isRecording ? "bg-destructive animate-pulse" : "bg-muted-foreground"
                  )} />
                  <span className="font-mono text-2xl">
                    {formatDuration(duration)} / {formatDuration(maxDuration)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Chunk indicator */}
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Chunk {currentChunk + 1}/{totalChunks}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="h-12 w-12 rounded-full text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={isRecording ? pauseRecording : resumeRecording}
                  disabled={isProcessing}
                  className="h-12 w-12 rounded-full"
                >
                  {isRecording ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  size="icon"
                  onClick={handleFinish}
                  disabled={isProcessing || duration < 5}
                  className="h-12 w-12 rounded-full"
                >
                  <CheckCircle className="h-5 w-5" />
                </Button>
              </div>

              {/* Leader notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  📝 Notas rápidas
                  <span className="text-xs font-normal text-muted-foreground">
                    (ajudam a IA a identificar o liderado)
                  </span>
                </label>
                <Textarea
                  value={leaderNotes}
                  onChange={(e) => setLeaderNotes(e.target.value)}
                  placeholder={`Ex: "${memberName} mencionou dificuldade com cliente X..."`}
                  rows={3}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Anote "{memberName} disse..." para ajudar na análise
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
