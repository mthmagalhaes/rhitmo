import { cn } from '@/lib/utils';

/**
 * Moldura padrão para ícones de integração (Brand Kit v1):
 * quadrado arredondado creme, borda quente, sombra difusa.
 */
interface ConnectorFrameProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'h-8 w-8 rounded-lg p-1.5',
  md: 'h-10 w-10 rounded-xl p-2',
  lg: 'h-14 w-14 rounded-2xl p-3',
} as const;

export function ConnectorFrame({ children, className, size = 'md' }: ConnectorFrameProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center border border-border bg-background shadow-xs',
        SIZES[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
