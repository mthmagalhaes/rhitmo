import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ThreadItem, ChatThread } from './ThreadItem';

interface ThreadSidebarProps {
  threads: ChatThread[];
  selectedThreadId: string | null;
  isLoading: boolean;
  onNewConversation: () => void;
  onSelectThread: (threadId: string) => void;
  onRenameThread: (threadId: string, currentTitle: string) => void;
  onDeleteThread: (threadId: string) => void;
}

export const ThreadSidebar = ({
  threads,
  selectedThreadId,
  isLoading,
  onNewConversation,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
}: ThreadSidebarProps) => {
  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* New conversation button */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewConversation}
          className="w-full gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      {/* Threads list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : threads.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em "Nova Conversa" para começar
              </p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={selectedThreadId === thread.id}
                onSelect={onSelectThread}
                onRename={onRenameThread}
                onDelete={onDeleteThread}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
