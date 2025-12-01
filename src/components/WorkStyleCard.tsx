import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, BookOpen, Target, Waves, Sunrise, Moon, Trophy, TrendingUp } from 'lucide-react';

interface WorkStyleData {
  processing: 'direct' | 'contextual';
  feedback: 'immediate' | 'scheduled';
  autonomy: 'directed' | 'autonomous';
  energy: 'morning' | 'evening';
  motivation: 'recognition' | 'growth';
  completed_at: string;
}

interface WorkStyleCardProps {
  data: WorkStyleData;
}

export const styleConfig = {
  processing: {
    direct: { label: 'Direto ao ponto', icon: Zap, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
    contextual: { label: 'Contexto completo', icon: BookOpen, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' }
  },
  feedback: {
    immediate: { label: 'Feedback na hora', icon: Zap, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
    scheduled: { label: 'Feedback na 1:1', icon: Target, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' }
  },
  autonomy: {
    directed: { label: 'Direcionamento claro', icon: Target, color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
    autonomous: { label: 'Autonomia', icon: Waves, color: 'bg-teal-500/10 text-teal-700 dark:text-teal-400' }
  },
  energy: {
    morning: { label: 'Produtivo pela manhã', icon: Sunrise, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
    evening: { label: 'Produtivo à tarde/noite', icon: Moon, color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' }
  },
  motivation: {
    recognition: { label: 'Reconhecimento', icon: Trophy, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
    growth: { label: 'Crescimento', icon: TrendingUp, color: 'bg-green-500/10 text-green-700 dark:text-green-400' }
  }
};

export function WorkStyleCard({ data }: WorkStyleCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          Rhitmo Sync
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Preferências de trabalho • Preenchido em {formatDate(data.completed_at)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Processing Style */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Processamento de informações</p>
            <div>
              {(() => {
                const config = styleConfig.processing[data.processing];
                const Icon = config.icon;
                return (
                  <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
          </div>

          {/* Feedback Style */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Estilo de feedback</p>
            <div>
              {(() => {
                const config = styleConfig.feedback[data.feedback];
                const Icon = config.icon;
                return (
                  <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
          </div>

          {/* Autonomy Style */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Estilo de trabalho</p>
            <div>
              {(() => {
                const config = styleConfig.autonomy[data.autonomy];
                const Icon = config.icon;
                return (
                  <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
          </div>

          {/* Energy Style */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Horário de pico</p>
            <div>
              {(() => {
                const config = styleConfig.energy[data.energy];
                const Icon = config.icon;
                return (
                  <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
          </div>

          {/* Motivation Style */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Motivação principal</p>
            <div>
              {(() => {
                const config = styleConfig.motivation[data.motivation];
                const Icon = config.icon;
                return (
                  <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Badge>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
