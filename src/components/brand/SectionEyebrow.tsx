import { cn } from '@/lib/utils';

/**
 * Eyebrow editorial do Brand Kit v1: traço curto + label Space Mono
 * 11px uppercase com tracking 0.25em.
 */
interface SectionEyebrowProps {
  children: React.ReactNode;
  className?: string;
  tone?: 'muted' | 'primary';
}

export function SectionEyebrow({ children, className, tone = 'muted' }: SectionEyebrowProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <span className={cn('h-px w-5', tone === 'primary' ? 'bg-primary' : 'bg-muted-foreground')} />
      <span
        className={cn(
          'font-mono text-[11px] font-bold uppercase tracking-[0.25em]',
          tone === 'primary' ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {children}
      </span>
    </div>
  );
}
