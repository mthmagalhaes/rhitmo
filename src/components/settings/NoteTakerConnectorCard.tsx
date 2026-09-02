import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Check,
  Loader2,
  NotebookPen,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  AlertTriangle,
  X,
} from 'lucide-react';
import { ConnectorFrame } from '@/components/brand/ConnectorFrame';
import { useNoteTaker } from '@/hooks/useNoteTaker';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import {
  FIDELITY_LABEL,
  noteTakerProvider,
  type NoteTakerProviderId,
} from '@/lib/noteTakerProviders';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  provider: NoteTakerProviderId;
}

/**
 * Conector BYOK de note taker pessoal: o líder cola a própria API key e a
 * Rhitmo importa as notas para Anotações & Evidências. Nenhuma chave volta
 * para o browser depois de salva.
 */
export function NoteTakerConnectorCard({ provider }: Props) {
  const meta = noteTakerProvider(provider);
  const {
    connection,
    isConnected,
    isLoading,
    needsReconnect,
    pending,
    connect,
    disconnect,
    sync,
    assign,
    dismiss,
  } = useNoteTaker(provider);
  const { members } = useLeaderMembers();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleConnect = async () => {
    await connect.mutateAsync(apiKey.trim());
    setApiKey('');
    setOpen(false);
  };

  return (
    <>
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <ConnectorFrame>
            <NotebookPen className="w-5 h-5 text-primary" />
          </ConnectorFrame>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-serif tracking-tight">{meta.label}</CardTitle>
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : isConnected ? (
                <Badge className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                  <Check className="h-3 w-3 mr-0.5" /> Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Disponível</Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {FIDELITY_LABEL[meta.fidelity]}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">{meta.description}</CardDescription>
            {isConnected && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {connection?.last_synced_at
                  ? `Sincronizado ${formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true, locale: ptBR })}`
                  : 'Ainda não sincronizado'}
                {typeof connection?.notes_imported === 'number' && connection.notes_imported > 0
                  ? ` · ${connection.notes_imported} nota(s) importada(s)`
                  : ''}
              </p>
            )}
            {isConnected && connection?.last_error && (
              <p className="text-[10px] text-destructive mt-1 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-[1px] shrink-0" />
                {connection.last_error}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isConnected ? (
            <div className="flex gap-2">
              {needsReconnect ? (
                <Button size="sm" className="flex-1 rounded-xl text-xs" onClick={() => setOpen(true)}>
                  <LinkIcon className="h-3 w-3 mr-1" /> Reconectar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => sync.mutate()}
                  disabled={sync.isPending}
                >
                  {sync.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sincronizar agora
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Unlink className="h-3 w-3 mr-1" />
                )}
                Desconectar
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="w-full rounded-xl text-xs"
              onClick={() => setOpen(true)}
              disabled={isLoading}
            >
              <LinkIcon className="h-3 w-3 mr-1" /> Conectar
            </Button>
          )}

          {isConnected && pending.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Notas aguardando atribuição
              </p>
              {pending.map((note) => (
                <div key={note.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {note.title ?? 'Reunião sem título'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {note.note_created_at
                          ? format(new Date(note.note_created_at), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Sem data'}
                        {note.attendees && note.attendees.length > 0
                          ? ` · ${note.attendees
                              .map((a) => a.name ?? a.email)
                              .filter(Boolean)
                              .slice(0, 3)
                              .join(', ')}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Descartar nota"
                      className="h-6 w-6 shrink-0"
                      title="Descartar nota"
                      onClick={() => dismiss.mutate(note.id)}
                      disabled={dismiss.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select
                    onValueChange={(memberId) => assign.mutate({ noteId: note.id, memberId })}
                    disabled={assign.isPending}
                  >
                    <SelectTrigger className="h-8 rounded-lg text-xs">
                      <SelectValue placeholder="Atribuir a um liderado" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif tracking-tight">Conectar o {meta.label}</SheetTitle>
            <SheetDescription>
              A Rhitmo lê as suas notas do {meta.label} e transforma em evidência em Anotações &amp; Evidências.
            </SheetDescription>
          </SheetHeader>

          <ol className="mt-6 space-y-4 text-sm">
            {meta.steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs grid place-items-center font-medium">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-3">
            <Input
              type="password"
              autoComplete="off"
              placeholder={meta.keyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="rounded-xl"
            />
            <Button
              className="w-full rounded-xl"
              onClick={handleConnect}
              disabled={apiKey.trim().length < 10 || connect.isPending}
            >
              {connect.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conectar e validar
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Importamos apenas notas cujos participantes batem com um liderado seu. Reuniões sem
              correspondência ficam aguardando você indicar de quem são.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
