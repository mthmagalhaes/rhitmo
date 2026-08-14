// Sprint 12.1 — Empty-state minimalista para o painel direito Master-Detail.
// Sem card colorido invasor: apenas ícone outline + título + descrição.
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
      <div className="text-center max-w-xs">
        <Icon
          className="h-10 w-10 mx-auto mb-4 text-muted-foreground"
          strokeWidth={1.5}
        />
        <h2 className="font-serif text-lg font-bold tracking-tight mb-1.5">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground/80 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
