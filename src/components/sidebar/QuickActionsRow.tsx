import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuickAction } from '@/lib/navigation';

interface Props {
  homeRoute: string;
  actions: QuickAction[];
  onOpenMentor?: () => void;
  onOpenSearch?: () => void;
}

export function QuickActionsRow({ homeRoute, actions, onOpenMentor, onOpenSearch }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handle = (a: QuickAction) => {
    if (a.action === 'open-mentor') return onOpenMentor?.();
    if (a.action === 'open-search') return onOpenSearch?.();
    if (a.to) navigate(a.to);
  };

  const baseBtn = cn(
    'h-8 w-8 inline-flex items-center justify-center rounded-lg',
    'text-sidebar-foreground/70 hover:text-sidebar-foreground',
    'hover:bg-sidebar-accent/50 transition-colors',
  );

  return (
    <div className="px-3 flex items-center gap-1">
      <button
        type="button"
        onClick={() => navigate(homeRoute)}
        className={cn(baseBtn, 'flex-1 justify-start gap-2 px-2 text-xs font-medium')}
        aria-label={t('nav.quick.home')}
      >
        <Home className="h-3.5 w-3.5" />
        <span>{t('nav.quick.home')}</span>
      </button>
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => handle(a)}
            className={baseBtn}
            aria-label={t(a.labelKey)}
            title={t(a.labelKey)}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
