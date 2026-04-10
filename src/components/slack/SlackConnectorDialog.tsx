import { MessageSquare, CheckCircle2, ExternalLink } from 'lucide-react';
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

interface SlackConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SlackConnectorDialog({ open, onOpenChange }: SlackConnectorDialogProps) {
  const { isConnected, isLoading, connectSlack } = useSlackConnection();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Conector Slack — Rhitmo Bot
          </DialogTitle>
          <DialogDescription>
            Use comandos como <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/rhitmo</code> direto no Slack para registrar notas, consultar briefs e receber nudges sem sair do chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Connection status */}
          {isConnected && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Slack conectado com sucesso!</p>
            </div>
          )}

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

          <Separator />

          {/* Instructions */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Como funciona:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Clique em <strong>"Conectar ao Slack"</strong> acima e autorize o app Rhitmo no seu workspace.</li>
              <li>Após autorizar, o bot <strong>Rhitmo</strong> aparecerá no seu Slack.</li>
              <li>Use <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/rhitmo</code> para acessar o menu de ações.</li>
              <li>Use <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/nota</code> para registrar uma observação rápida sobre um liderado.</li>
              <li>Use <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/kudos</code> para reconhecer publicamente um membro do time.</li>
            </ol>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Comandos disponíveis:</p>
            <div className="grid gap-2">
              {[
                { cmd: '/rhitmo', desc: 'Menu principal com todas as ações' },
                { cmd: '/nota', desc: 'Registrar observação sobre um liderado' },
                { cmd: '/kudos', desc: 'Reconhecimento público no canal' },
                { cmd: '/brief', desc: 'Resumo consolidado de um membro' },
                { cmd: '/meu-pdi', desc: 'Ver seu plano de desenvolvimento (liderados)' },
              ].map(({ cmd, desc }) => (
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
