import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-muted/50 p-6 mb-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
};
