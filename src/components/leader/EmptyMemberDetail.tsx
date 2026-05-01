// Sprint 12 — Empty-state for the right pane of Master-Detail leader pages.
import { Users, type LucideIcon } from 'lucide-react';

interface EmptyMemberDetailProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

export function EmptyMemberDetail({
  icon: Icon = Users,
  title = 'Selecione um liderado',
  description = 'Escolha alguém na lista à esquerda para ver o histórico ou adicionar notas.',
}: EmptyMemberDetailProps) {
  return (
    <div className="h-full min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-serif text-xl font-bold tracking-tight mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
