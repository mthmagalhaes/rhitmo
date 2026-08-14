import { LucideIcon } from 'lucide-react';
import { WaveGlyph } from '@/components/brand/WaveGlyph';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <WaveGlyph icon={Icon} className="mb-6" />
      <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground mb-3">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
};
