import { Feedback } from '@/types/team';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface FeedbackTimelineProps {
  feedbacks: Feedback[];
}

export const FeedbackTimeline = ({ feedbacks }: FeedbackTimelineProps) => {
  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'positive':
        return 'default';
      case 'constructive':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'positive':
        return 'Positivo';
      case 'constructive':
        return 'Construtivo';
      default:
        return 'Neutro';
    }
  };

  return (
    <div className="space-y-4">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id} className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <Badge variant={getTypeVariant(feedback.type)}>
                {getTypeLabel(feedback.type)}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(feedback.date).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <p className="text-foreground leading-relaxed">{feedback.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
