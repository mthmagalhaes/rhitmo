import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTagEmoji } from '@/lib/tagConfig';

interface Feedback {
  id: string;
  title?: string | null;
  content: string;
  occurred_at?: string;
  created_at: string;
  tags?: string[] | null;
}

interface ContextPickerProps {
  feedbacks: Feedback[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const ContextPicker = ({ 
  feedbacks, 
  selectedIds, 
  onSelectionChange 
}: ContextPickerProps) => {
  const [open, setOpen] = useState(false);

  // Sort by date descending and take first 15
  const sortedFeedbacks = [...feedbacks]
    .sort((a, b) => 
      new Date(b.occurred_at || b.created_at).getTime() - 
      new Date(a.occurred_at || a.created_at).getTime()
    )
    .slice(0, 15);

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(x => x !== id));
    }
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const handleApply = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Contexto</span>
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
              {selectedIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-medium text-foreground">Selecionar Notas</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Escolha notas específicas ou deixe vazio para modo automático
          </p>
        </div>
        
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {sortedFeedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>Nenhuma nota encontrada</p>
              </div>
            ) : (
              sortedFeedbacks.map(fb => (
                <label 
                  key={fb.id} 
                  className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                >
                  <Checkbox 
                    checked={selectedIds.includes(fb.id)}
                    onCheckedChange={(checked) => handleToggle(fb.id, !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {format(new Date(fb.occurred_at || fb.created_at), 'dd/MM', { locale: ptBR })}
                      </span>
                      <span className={`text-sm truncate ${fb.title ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                        {fb.title || 'Anotação não classificada'}
                      </span>
                    </div>
                    {fb.tags && fb.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {fb.tags.slice(0, 2).map(tag => (
                          <Badge 
                            key={tag} 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {getTagEmoji(tag)} {tag}
                          </Badge>
                        ))}
                        {fb.tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{fb.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t border-border flex justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClear}
            disabled={selectedIds.length === 0}
          >
            Limpar
          </Button>
          <Button size="sm" onClick={handleApply}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
