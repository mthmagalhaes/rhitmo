import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, Edit2, Check, X, Mic, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExtractedFeedback {
  id: string;
  type: 'positive' | 'development';
  content: string;
  evidence: string;
  coaching_tip: string;
  confidence?: 'high' | 'medium';
}

export interface SpeakerAnalysis {
  notes_available: boolean;
  identification_method: 'notes_plus_heuristics' | 'heuristics_only';
  high_confidence_count: number;
  medium_confidence_count: number;
  discarded_low_confidence: number;
}

export interface MeetingAnalysis {
  feedbacks: ExtractedFeedback[];
  commitments: string[];
  themes: string[];
  speaker_analysis?: SpeakerAnalysis;
}

interface MeetingReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  duration: number;
  analysis: MeetingAnalysis;
  onSave: (feedbacks: ExtractedFeedback[], commitments: string[]) => Promise<void>;
  onDiscard: () => void;
}

export const MeetingReviewDialog = ({
  open,
  onOpenChange,
  memberName,
  duration,
  analysis,
  onSave,
  onDiscard,
}: MeetingReviewDialogProps) => {
  const [feedbacks, setFeedbacks] = useState<ExtractedFeedback[]>(analysis.feedbacks);
  const [commitments] = useState<string[]>(analysis.commitments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}min`;
  };

  const handleEdit = (feedback: ExtractedFeedback) => {
    setEditingId(feedback.id);
    setEditContent(feedback.content);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setFeedbacks(prev => prev.map(f => 
      f.id === editingId ? { ...f, content: editContent } : f
    ));
    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(feedbacks, commitments);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Deseja descartar toda a análise? Esta ação não pode ser desfeita.')) {
      onDiscard();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análise da Reunião com {memberName}
          </DialogTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mic className="h-3 w-3" />
              {formatDuration(duration)}
            </span>
            <span>•</span>
            <span>{feedbacks.length} feedbacks identificados</span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {feedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum feedback identificado na reunião.</p>
                <p className="text-sm mt-1">Tente gravar uma reunião mais longa ou com mais discussão.</p>
              </div>
            ) : (
              feedbacks.map((feedback, index) => (
                <Card key={feedback.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant={feedback.type === 'positive' ? 'default' : 'secondary'}
                        className={cn(
                          "gap-1",
                          feedback.type === 'positive' 
                            ? "bg-success/10 text-success border-success/20" 
                            : "bg-warning/10 text-warning border-warning/20"
                        )}
                      >
                        {feedback.type === 'positive' ? '💚 Ponto Positivo' : '🟡 Desenvolvimento'}
                      </Badge>
                      {feedback.confidence === 'medium' && (
                        <Badge variant="outline" className="text-xs bg-muted/50">
                          🔍 Inferido
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {editingId !== feedback.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(feedback)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(feedback.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId === feedback.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                          <Check className="h-3 w-3" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1">
                          <X className="h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm mb-3">{feedback.content}</p>
                      
                      <div className="bg-muted/50 rounded-md p-2 mb-2">
                        <p className="text-xs text-muted-foreground">
                          📎 <em>"{feedback.evidence}"</em>
                        </p>
                      </div>
                      
                      <p className="text-xs text-primary">
                        💡 {feedback.coaching_tip}
                      </p>
                    </>
                  )}
                </Card>
              ))
            )}

            {/* Commitments */}
            {commitments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">📋 Compromissos de {memberName}:</h4>
                  <ul className="space-y-1">
                    {commitments.map((commitment, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span>•</span>
                        <span>{commitment}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Themes */}
            {analysis.themes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Temas recorrentes:</span>
                {analysis.themes.map((theme, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
            {/* Speaker Analysis Info */}
            {analysis.speaker_analysis && (
              <div className="bg-muted/30 rounded-md p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">📊 Qualidade da análise:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>✅ Alta confiança: {analysis.speaker_analysis.high_confidence_count}</span>
                  <span>🔍 Inferidos: {analysis.speaker_analysis.medium_confidence_count}</span>
                  {analysis.speaker_analysis.discarded_low_confidence > 0 && (
                    <span>⚠️ Descartados: {analysis.speaker_analysis.discarded_low_confidence}</span>
                  )}
                </div>
                {!analysis.speaker_analysis.notes_available && (
                  <p className="mt-1 text-primary/80">
                    💡 Dica: adicionar notas durante a reunião melhora a precisão
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDiscard} disabled={saving}>
            Descartar
          </Button>
          <Button onClick={handleSave} disabled={saving || feedbacks.length === 0} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Feedbacks ({feedbacks.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
