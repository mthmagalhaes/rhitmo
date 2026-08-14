import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaIcon?: LucideIcon;
  /** Optional secondary action (link/ghost button). */
  secondary?: ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Windmill-style empty state. Soft circular icon + tracking-tight title + 1 CTA.
 * Use at the top of a feature when the user has nothing yet.
 */
export function EmptyStateHero({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  ctaIcon: CtaIcon,
  secondary,
  variant = 'default',
  className,
}: EmptyStateHeroProps) {
  const compact = variant === 'compact';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center mx-auto',
        'rounded-3xl border border-border/40 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)]',
        compact ? 'px-6 py-10 max-w-xl' : 'px-8 py-16 max-w-2xl',
        className
      )}
    >
      <WaveGlyph icon={Icon} size={compact ? 'sm' : 'md'} className="mb-6" />
      <h2
        className={cn(
          'font-serif font-bold tracking-tight text-foreground mb-3',
          compact ? 'text-xl' : 'text-2xl md:text-3xl'
        )}
      >
        {title}
      </h2>
      <p className={cn('text-muted-foreground leading-relaxed mb-6', compact ? 'text-sm' : 'text-base')}>
        {description}
      </p>
      {(ctaLabel || secondary) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {ctaLabel && onCta && (
            <Button onClick={onCta} size={compact ? 'default' : 'lg'} className="rounded-xl">
              {CtaIcon && <CtaIcon className="w-4 h-4 mr-2" />}
              {ctaLabel}
            </Button>
          )}
          {secondary}
        </div>
      )}
    </div>
  );
}
