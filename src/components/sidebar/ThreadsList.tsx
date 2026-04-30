import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { cn } from '@/lib/utils';
import type { SidebarPersona } from '@/lib/navigation';

interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

interface Props {
  persona: SidebarPersona;
}

export function ThreadsList({ persona }: Props) {
  const { t } = useTranslation();
  const { id: userId } = useEffectiveUser();
  const navigate = useNavigate();

  const types = persona === 'leader' ? ['mentor', 'brief'] : ['meu_rhitmo'];

  const { data: threads = [] } = useQuery({
    queryKey: ['sidebar-threads', userId, persona],
    queryFn: async (): Promise<Thread[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .in('type', types)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return (data ?? []) as Thread[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  if (threads.length === 0) return null;

  const heading =
    persona === 'leader' ? t('nav.threads.conversas_hoje') : t('nav.threads.conversas_privadas');

  return (
    <div className="px-2 pt-3">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
        {heading}
      </p>
      <ul className="space-y-0.5">
        {threads.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => navigate(`/chat/${t.id}`)}
              className={cn(
                'group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg',
                'text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground',
                'hover:bg-sidebar-accent/40 transition-colors text-left',
              )}
            >
              <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground/60 group-hover:text-primary" />
              <span className="truncate flex-1">{t.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
