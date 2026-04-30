import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, Building2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAccount } from '@/contexts/AccountContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface WorkspaceRow {
  id: string;
  name: string;
  is_active: boolean | null;
}

export function WorkspaceSwitcher() {
  const { id: userId } = useEffectiveUser();
  const { workspaceId, isHRAdmin } = useAccount();

  const { data: workspaces = [] } = useQuery({
    queryKey: ['sidebar-workspaces', userId],
    queryFn: async (): Promise<WorkspaceRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, is_active')
        .order('name', { ascending: true });
      if (error) return [];
      return (data ?? []) as WorkspaceRow[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const current = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0] ?? null;
  const hasMultiple = workspaces.length > 1;
  const showHRContext = isHRAdmin && current;

  const trigger = (
    <button
      type="button"
      disabled={!hasMultiple}
      className={cn(
        'group w-full flex items-center gap-2 px-3 py-2 rounded-xl',
        'bg-sidebar-accent/30 hover:bg-sidebar-accent/60 transition-colors',
        'text-left text-sm',
        !hasMultiple && 'cursor-default opacity-90',
      )}
      aria-label={current ? `Workspace ${current.name}` : 'Workspace'}
    >
      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Building2 className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sidebar-foreground leading-tight">
          {current?.name ?? 'Workspace'}
          {showHRContext && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">
              · RH
            </span>
          )}
        </p>
      </div>
      <ChevronsUpDown
        className={cn(
          'h-3.5 w-3.5 shrink-0 text-muted-foreground/60',
          !hasMultiple && 'opacity-30',
        )}
      />
    </button>
  );

  if (!hasMultiple) return trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs">Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => {
              // Workspace switching needs a full reload to refresh AccountContext.
              if (w.id !== workspaceId) {
                window.location.href = '/';
              }
            }}
            className="flex items-center gap-2"
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === workspaceId && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
