import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, Calendar, Settings, Compass } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import {
  LEADER_NAV_ITEMS,
  DIRECT_REPORT_NAV_ITEMS,
  HR_ADMIN_NAV_ITEMS,
  type SidebarPersona,
} from '@/lib/navigation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: SidebarPersona;
}

interface MemberRow {
  id: string;
  name: string;
  role: string | null;
}

interface ThreadRow {
  id: string;
  title: string | null;
  type: string;
}

export function GlobalSearchDialog({ open, onOpenChange, persona }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: userId } = useEffectiveUser();
  const [query, setQuery] = useState('');

  // Cmd/Ctrl+K shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const { data: members = [] } = useQuery({
    queryKey: ['global-search-members', userId],
    queryFn: async (): Promise<MemberRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, role')
        .order('name', { ascending: true })
        .limit(50);
      if (error) return [];
      return (data ?? []) as MemberRow[];
    },
    enabled: !!userId && open,
    staleTime: 60_000,
  });

  const { data: threads = [] } = useQuery({
    queryKey: ['global-search-threads', userId],
    queryFn: async (): Promise<ThreadRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id, title, type')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(15);
      if (error) return [];
      return (data ?? []) as ThreadRow[];
    },
    enabled: !!userId && open,
    staleTime: 60_000,
  });

  const navItems =
    persona === 'leader'
      ? LEADER_NAV_ITEMS
      : persona === 'hr_admin'
        ? HR_ADMIN_NAV_ITEMS
        : DIRECT_REPORT_NAV_ITEMS;

  const go = (path: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t('nav.search.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t('nav.search.empty')}</CommandEmpty>

        <CommandGroup heading={t('nav.search.pages')}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`page-${item.id}-${t(item.labelKey)}`}
                onSelect={() => go(item.to)}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span>{t(item.labelKey)}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {persona === 'leader' && members.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('nav.search.people')}>
              {members.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`member-${m.name}-${m.role ?? ''}`}
                  onSelect={() => go(`/member/${m.id}`)}
                >
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1">{m.name}</span>
                  {m.role && (
                    <span className="text-xs text-muted-foreground">{m.role}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {threads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('nav.search.threads')}>
              {threads.map((th) => (
                <CommandItem
                  key={th.id}
                  value={`thread-${th.title ?? th.type}`}
                  onSelect={() => go(`/chat/${th.id}`)}
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{th.title ?? t('nav.threads.untitled')}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
