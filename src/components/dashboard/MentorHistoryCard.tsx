import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Thread {
  id: string;
  title: string;
  type: string;
  updated_at: string;
  member_id: string | null;
  source: string;
}

interface Props {
  onOpenMentor: () => void;
}

export function MentorHistoryCard({ onOpenMentor }: Props) {
  const { id: userId } = useEffectiveUser();
  const navigate = useNavigate();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['mentor-history', userId],
    queryFn: async (): Promise<Thread[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id, title, type, updated_at, member_id, source')
        .eq('user_id', userId)
        .in('type', ['mentor', 'brief'])
        .order('updated_at', { ascending: false })
        .limit(8);
      if (error) return [];
      return (data ?? []) as Thread[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Histórico da Rhitmo
        </p>
        {threads.length > 0 && (
          <button
            type="button"
            onClick={onOpenMentor}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            Nova conversa
            <Sparkles className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Carregando…</div>
        ) : threads.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground mb-1.5">
              Sem conversas com a Rhitmo ainda
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
              Pergunte sobre um liderado, prepare uma 1:1 ou peça uma análise de padrões do seu time.
            </p>
            <Button onClick={onOpenMentor} className="rounded-xl gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Pergunte ao Mentor
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (thread.source === 'slack' || !thread.member_id) {
                      navigate(`/lider/mentor/${thread.id}`);
                    } else {
                      navigate(`/member/${thread.member_id}?thread=${thread.id}`);
                    }
                  }}
                  className={cn(
                    'group w-full flex items-center gap-3 px-5 py-3.5 text-left',
                    'hover:bg-muted/40 transition-colors'
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {thread.title || 'Conversa sem título'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(thread.updated_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                      {thread.type === 'brief' && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-primary/70 font-semibold">
                          Brief
                        </span>
                      )}
                      {thread.source === 'slack' && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-primary/70 font-semibold">
                          🌀 Slack
                        </span>
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
