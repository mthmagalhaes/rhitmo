import { useNavigate } from 'react-router-dom';
import { PenSquare, Heart, BarChart3, Mic } from 'lucide-react';

interface QuickActionsCardProps {
  onNewNote: () => void;
}

const actions = [
  { icon: PenSquare, label: 'Nova Nota', action: 'note' as const },
  { icon: Heart, label: 'Enviar Kudos', action: 'kudos' as const },
  { icon: BarChart3, label: 'Ver Analytics', action: 'analytics' as const },
  { icon: Mic, label: 'Gravar Reunião', action: 'record' as const },
];

export const QuickActionsCard = ({ onNewNote }: QuickActionsCardProps) => {
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    switch (action) {
      case 'note':
        onNewNote();
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'kudos':
      case 'record':
        // These navigate to first member or open globally
        onNewNote();
        break;
    }
  };

  return (
    <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-5">
      <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4 flex items-center gap-2">
        ⚡ Ações Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ icon: Icon, label, action }) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 hover:bg-accent/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
