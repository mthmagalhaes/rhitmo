import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

interface MeetingProcessingDialogProps {
  open: boolean;
  totalChunks: number;
  currentChunk: number;
  isAnalyzing: boolean;
  totalDuration: number;
}

export const MeetingProcessingDialog = ({
  open,
  totalChunks,
  currentChunk,
  isAnalyzing,
  totalDuration,
}: MeetingProcessingDialogProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Processando reunião ({formatDuration(totalDuration)})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Chunk progress */}
          <div className="space-y-2">
            {Array.from({ length: totalChunks }).map((_, i) => {
              const isCompleted = i < currentChunk;
              const isProcessing = i === currentChunk && !isAnalyzing;
              const isPending = i > currentChunk || (i === currentChunk && isAnalyzing);

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={
                    isCompleted ? 'text-foreground' : 
                    isProcessing ? 'text-primary font-medium' : 
                    'text-muted-foreground'
                  }>
                    Chunk {i + 1}/{totalChunks} - {
                      isCompleted ? 'Transcrito' :
                      isProcessing ? 'Processando...' :
                      'Aguardando'
                    }
                  </span>
                </div>
              );
            })}
          </div>

          {/* Analysis indicator */}
          {isAnalyzing && (
            <div className="flex items-center gap-3 text-sm pt-2 border-t">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-primary font-medium">
                Analisando comportamentos...
              </span>
            </div>
          )}

          {/* Estimated time */}
          <p className="text-xs text-muted-foreground text-center">
            Tempo estimado: ~{Math.ceil(totalDuration / 60)} minuto{totalDuration > 60 ? 's' : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
