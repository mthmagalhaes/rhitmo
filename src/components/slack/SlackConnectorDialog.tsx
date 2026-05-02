import { CheckCircle2, ExternalLink, Hash, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SlackIcon } from '@/components/icons/SlackIcon';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { SLACK_COMMANDS } from '@/lib/slackCommands';

interface SlackConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SlackConnectorDialog({ open, onOpenChange }: SlackConnectorDialogProps) {
  const { isConnected, isLoading, connectSlack } = useSlackConnection();
  const navigate = useNavigate();

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlackIcon className="h-5 w-5" />
            Conector Slack — Rhitmo Bot
          </DialogTitle>
          <DialogDescription>
            O Rhitmo captura sinais relevantes do dia-a-dia direto dos canais públicos onde o bot estiver presente — sem invadir DMs nem canais privados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Connection status */}
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
              <p className="text-sm text-muted-foreground">Verificando status da conexão…</p>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Slack conectado com sucesso!</p>
            </div>
          ) : null}

          {/* Connect / Reconnect button */}
          <Button
            onClick={connectSlack}
            disabled={isLoading}
            className="w-full rounded-xl gap-2"
            variant={isConnected ? 'outline' : 'default'}
          >
            <ExternalLink className="h-4 w-4" />
            {isConnected ? 'Reconectar Slack' : 'Conectar ao Slack'}
          </Button>

          {/* Quick links — only when connected */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => goTo('/slack/channels')}
              >
                <Hash className="h-4 w-4" />
                Gerenciar canais
              </Button>
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => goTo('/evidence')}
              >
                <Sparkles className="h-4 w-4" />
                Ver evidências
              </Button>
            </div>
          )}

          <Separator />

          {/* Instructions */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Como funciona:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Clique em <strong>"Conectar ao Slack"</strong> acima e autorize o app Rhitmo no seu workspace.</li>
              <li>Após autorizar, o bot <strong>Rhitmo</strong> aparecerá no seu Slack.</li>
              <li>Convide o bot <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">@Rhitmo</code> nos canais públicos onde seu time conversa, ou ative o autojoin em <strong>Gerenciar canais</strong>.</li>
              <li>O Rhitmo identifica entregas, reconhecimentos, bloqueios e conflitos automaticamente. Você revisa em <strong>Evidências</strong> e converte em notas com 1 clique.</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Comandos disponíveis (opcional):</p>
            <div className="grid gap-2">
              {SLACK_COMMANDS.map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-start gap-2 text-sm">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono shrink-0">{cmd}</code>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
