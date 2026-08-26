import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useBotHoursUsage } from '@/hooks/useBotHoursUsage';
import { cn } from '@/lib/utils';

const fmt = (h: number) => `${h.toFixed(1).replace('.', ',')}h`;

/**
 * Versão compacta do BotHoursCard para a sidebar.
 * Mesma lógica de cor por percentual do card completo.
 */
export function SidebarBotHoursMeter() {
  const navigate = useNavigate();
  const { data, isLoading } = useBotHoursUsage();

  if (isLoading || !data) return null;

  const tone =
    data.percent >= 100
      ? { text: 'text-destructive', bar: 'bg-destructive' }
      : data.percent >= 80
      ? { text: 'text-amber-600', bar: 'bg-amber-500' }
      : { text: 'text-sidebar-foreground/70', bar: 'bg-primary' };

  return (
    <button
      type="button"
      onClick={() => navigate('/lider/configuracoes?tab=integracoes')}
      className={cn(
        'w-full mx-2 px-3 py-2 rounded-xl text-left',
        'hover:bg-sidebar-accent/40 transition-colors',
      )}
      style={{ width: 'calc(100% - 1rem)' }}
      title="Horas de transcrição do bot neste mês"
      aria-label="Horas de transcrição do bot neste mês"
    >
      <div className="flex items-center gap-2 text-xs">
        <Clock className={cn('h-3.5 w-3.5 shrink-0', tone.text)} />
        {data.unlimited ? (
          <span className="text-sidebar-foreground/70 truncate">
            {fmt(data.hoursUsed)} usadas · sem teto
          </span>
        ) : (
          <span className={cn('truncate', tone.text)}>
            {fmt(data.hoursUsed)} de {fmt(data.hoursCap)}
          </span>
        )}
      </div>
      {!data.unlimited && (
        <div className="mt-1.5 h-1 w-full rounded-full bg-sidebar-accent/60 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', tone.bar)}
            style={{ width: `${Math.max(2, data.percent)}%` }}
          />
        </div>
      )}
    </button>
  );
}
