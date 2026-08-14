import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarPersona } from '@/lib/navigation';

interface Props {
  persona: SidebarPersona;
}

/**
 * Persistent AI CTA — alinhado com a métrica do SidebarMenuButton (h-8, px-2,
 * gap-2, rounded-md, text-sm) para casar verticalmente com a navegação.
 * Mantém destaque visual sutil via gradient + borda + ícone primary.
 */
export function SidebarFooterCTA({ persona }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleClick = () => {
    if (persona === 'leader') {
      navigate('/lider/mentor');
    } else {
      navigate('/liderado/meu-rhitmo');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-left',
        'text-sidebar-foreground transition-colors tracking-tight',
        'bg-gradient-to-r from-primary/10 to-primary/5',
        'hover:from-primary/15 hover:to-primary/10',
        'border border-primary/25',
      )}
    >
      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate flex-1">
        {persona === 'leader' ? t('nav.cta.pergunte_mentor') : t('nav.cta.meu_rhitmo')}
      </span>
      {persona === 'direct_report' && (
        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}
