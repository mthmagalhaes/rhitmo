import { Hash, Lock, Check, Pause, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SlackChannel } from '@/hooks/useSlackChannels';

interface Props {
  channel: SlackChannel;
  busy?: boolean;
  onToggleExclude: (channelId: string, exclude: boolean) => void;
  onJoin: (channelId: string) => void;
}

export function ChannelRow({ channel, busy, onToggleExclude, onJoin }: Props) {
  const Icon = channel.is_private ? Lock : Hash;

  // Estados:
  // 1. is_member && !is_excluded → Monitorando
  // 2. is_member && is_excluded → Excluído
  // 3. !is_member && !is_private → Disponível (botão Adicionar)
  // 4. !is_member && is_private → Não acessível (precisa convidar no Slack)

  const monitoring = channel.is_member && !channel.is_excluded;
  const excluded = channel.is_member && channel.is_excluded;
  const availablePublic = !channel.is_member && !channel.is_private;
  const inaccessiblePrivate = !channel.is_member && channel.is_private;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm tracking-tight truncate">{channel.name}</span>
          {monitoring && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 text-[10px] font-semibold border-0">
              Monitorando
            </Badge>
          )}
          {excluded && (
            <Badge variant="secondary" className="text-[10px] font-semibold">
              Pausado
            </Badge>
          )}
          {availablePublic && (
            <Badge variant="outline" className="text-[10px] font-semibold">
              Disponível
            </Badge>
          )}
          {inaccessiblePrivate && (
            <Badge variant="outline" className="text-[10px] font-semibold">
              Privado
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {channel.num_members}
          </span>
          {channel.topic && <span className="truncate">· {channel.topic}</span>}
        </div>
      </div>

      <div className="shrink-0">
        {monitoring && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onToggleExclude(channel.id, true)}
            className="rounded-xl text-muted-foreground hover:text-foreground"
          >
            <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
          </Button>
        )}
        {excluded && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onToggleExclude(channel.id, false)}
            className="rounded-xl"
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Reativar
          </Button>
        )}
        {availablePublic && (
          <Button
            size="sm"
            variant="default"
            disabled={busy}
            onClick={() => onJoin(channel.id)}
            className="rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        )}
        {inaccessiblePrivate && (
          <span className="text-xs text-muted-foreground italic">Convide no Slack</span>
        )}
      </div>
    </div>
  );
}
