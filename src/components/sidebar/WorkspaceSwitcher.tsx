import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronsUpDown, Building2, Check, Settings, LifeBuoy, UserPlus, Sparkles, Shield } from 'lucide-react';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAccount } from '@/contexts/AccountContext';
import { resolvePersona } from '@/lib/navigation';
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

interface WorkspaceSwitcherProps {
  onOpenInvite?: () => void;
}

export function WorkspaceSwitcher({ onOpenInvite }: WorkspaceSwitcherProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: userId } = useEffectiveUser();
  const { workspaceId, isHRAdmin, isLeader, isLinkedMember, isWorkspaceOwner } = useAccount();
  const { reset: resetTour, isLeader: tourCanRun } = useOnboardingTour();

  const persona = resolvePersona({ isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner });
  // HR Admin (não-owner) usa as configurações do líder — é onde mora a aba "Acessos".
  const settingsRoute = persona === 'direct_report' ? '/liderado/configuracoes' : '/lider/configuracoes';
  const helpRoute = `${settingsRoute}?tab=ajuda`;
  const canInvite = persona === 'leader' && !!onOpenInvite;

  const handleReplayTour = async () => {
    await resetTour();
    if (window.location.pathname !== '/lider/inicio') {
      navigate('/lider/inicio?startTour=1');
    } else {
      window.dispatchEvent(new CustomEvent('rhitmo:start-tour'));
    }
  };

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
      className={cn(
        'group w-full flex items-center gap-2 px-3 py-2 rounded-xl',
        'bg-sidebar-accent/30 hover:bg-sidebar-accent/60 transition-colors',
        'text-left text-sm',
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
      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {hasMultiple && (
          <>
            <DropdownMenuLabel className="text-xs">Workspaces</DropdownMenuLabel>
            {workspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onSelect={() => {
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
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onSelect={() => navigate(settingsRoute)}
          className="flex items-center gap-2"
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t('sidebar.workspace.settings', 'Configurações')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => navigate(helpRoute)}
          className="flex items-center gap-2"
        >
          <LifeBuoy className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t('sidebar.workspace.helpCenter', 'Central de Ajuda')}</span>
        </DropdownMenuItem>

        {tourCanRun && (
          <DropdownMenuItem
            onSelect={handleReplayTour}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Refazer tour de boas-vindas</span>
          </DropdownMenuItem>
        )}

        {canInvite && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onOpenInvite?.()}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t('sidebar.workspace.inviteMembers', 'Adicionar liderado(a)')}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
