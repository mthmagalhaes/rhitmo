import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ThreadItemProps {
  thread: ChatThread;
  isActive: boolean;
  onSelect: (threadId: string) => void;
  onRename: (threadId: string, currentTitle: string) => void;
  onDelete: (threadId: string) => void;
}

export const ThreadItem = ({ 
  thread, 
  isActive, 
  onSelect, 
  onRename, 
  onDelete 
}: ThreadItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent selecting when clicking dropdown
    if ((e.target as HTMLElement).closest('[data-dropdown]')) return;
    onSelect(thread.id);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer group",
        "hover:bg-accent/50 transition-colors",
        isActive && "bg-accent"
      )}
    >
      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">
          {thread.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(thread.updated_at), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild data-dropdown>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRename(thread.id, thread.title)}>
            <Pencil className="h-4 w-4 mr-2" /> Renomear
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(thread.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
