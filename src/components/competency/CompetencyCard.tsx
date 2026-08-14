import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CompetencyCardProps {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  levelCount: number;
  onEdit: () => void;
  onToggleActive: () => void;
}

export const CompetencyCard = ({
  id, name, description, isActive, levelCount, onEdit, onToggleActive,
}: CompetencyCardProps) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 rounded-3xl shadow-sm p-6 transition-all ${
        isDragging ? 'opacity-60 shadow-lg scale-[1.02]' : ''
      } ${
        isActive
          ? 'bg-card border-l-4 border-primary'
          : 'bg-muted/40 border-l-4 border-border'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
        <Badge variant="secondary" className="mt-2 text-xs">
          {levelCount} nívei{levelCount !== 1 ? 's' : ''} definido{levelCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ativar ou desativar competência" className="h-9 w-9 text-muted-foreground hover:text-destructive">
              <Power className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isActive ? 'Desativar competência?' : 'Reativar competência?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isActive
                  ? 'Competências desativadas não aparecem em avaliações futuras. Dados históricos serão mantidos.'
                  : 'A competência voltará a aparecer em novas avaliações.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onToggleActive}>
                {isActive ? 'Desativar' : 'Reativar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
