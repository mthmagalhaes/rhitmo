import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarPersona } from '@/lib/navigation';

interface Props {
  persona: SidebarPersona;
}

/**
 * Persistent AI CTA pinned in the sidebar footer.
 * Leader → "Pergunte ao Mentor" (navigates to leader home and dispatches an
 * `open-mentor-chat` window event the dashboard can listen to).
 * Direct report → "Meu Rhitmo · privado" (navigates to dedicated route).
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
        'mx-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl',
        'bg-gradient-to-r from-primary/10 to-primary/5',
        'hover:from-primary/15 hover:to-primary/10 transition-colors',
        'border border-primary/20 text-left w-[calc(100%-1rem)]',
      )}
    >
      <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sidebar-foreground leading-tight truncate">
          {persona === 'leader' ? t('nav.cta.pergunte_mentor') : t('nav.cta.meu_rhitmo')}
        </p>
        {persona === 'direct_report' && (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-0.5">
            <Lock className="h-2.5 w-2.5" />
            {t('nav.cta.privado')}
          </p>
        )}
      </div>
    </button>
  );
}
