import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Ilustração de estado vazio do Brand Kit v1: as três ondas em tint roxo,
 * com o ícone contextual repousando sobre elas.
 */
interface WaveGlyphProps {
  icon?: LucideIcon;
  className?: string;
  size?: 'sm' | 'md';
}

export function WaveGlyph({ icon: Icon, className, size = 'md' }: WaveGlyphProps) {
  const box = size === 'sm' ? 88 : 120;
  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: box, height: box }}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="58" fill="hsl(var(--primary) / 0.06)" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M16 ${68 + i * 9} C34 ${60 + i * 9}, 48 ${78 + i * 9}, 62 ${68 + i * 9} S94 ${58 + i * 9}, 104 ${68 + i * 9}`}
            stroke="hsl(var(--primary))"
            strokeWidth={3 - i * 0.4}
            strokeLinecap="round"
            fill="none"
            opacity={0.5 - i * 0.14}
          />
        ))}
      </svg>
      {Icon && <Icon className={cn('relative text-primary', size === 'sm' ? 'h-6 w-6' : 'h-8 w-8')} strokeWidth={1.6} />}
    </div>
  );
}
