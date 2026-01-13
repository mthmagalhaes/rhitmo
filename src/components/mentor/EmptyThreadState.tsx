import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickSuggestion {
  emoji: string;
  text: string;
  hiddenMessage: string;
}

interface EmptyThreadStateProps {
  memberName: string;
  suggestions: QuickSuggestion[];
  onSuggestionClick: (suggestion: QuickSuggestion) => void;
  isLoading: boolean;
}

export const EmptyThreadState = ({
  memberName,
  suggestions,
  onSuggestionClick,
  isLoading,
}: EmptyThreadStateProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <Sparkles className="h-12 w-12 text-primary/20 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        Como posso ajudar?
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Pergunte sobre {memberName} ou escolha uma sugestão
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {suggestions.map((suggestion, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => onSuggestionClick(suggestion)}
            disabled={isLoading}
            className="gap-1"
          >
            <span>{suggestion.emoji}</span>
            {suggestion.text}
          </Button>
        ))}
      </div>
    </div>
  );
};
