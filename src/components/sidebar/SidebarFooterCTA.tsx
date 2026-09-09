import { useLocation, useNavigate } from 'react-router-dom';
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
 *
 * UX: o fundo preenchido é reservado ao item da PÁGINA ATIVA (mesmo padrão do
 * restante do menu). Quando não está ativo, o destaque de "recurso de IA" vem
 * só do ícone sparkles + contorno sutil — nunca de um background preenchido,
 * que fazia parecer que dois itens estavam selecionados ao mesmo tempo.
 */
export function SidebarFooterCTA({ persona }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const target = persona === 'leader' ? '/lider/mentor' : '/liderado/meu-rhitmo';
  const isActive =
    location.pathname === target || location.pathname.startsWith(`${target}/`);

  return (
    <button
      type="button"
      onClick={() => navigate(target)}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-left',
        'transition-colors tracking-tight',
        isActive
          ? cn(
              'bg-background text-sidebar-foreground font-semibold',
              'border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
              'dark:bg-primary/10 dark:text-primary dark:border-primary/20',
            )
          : cn(
              'font-medium text-sidebar-foreground/75 border border-transparent',
              'ring-1 ring-inset ring-primary/20',
              'hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
            ),
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
