import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

interface PendingUser {
  email: string;
  full_name: string | null;
  role: string;
  team_name: string | null;
}

export const DispatchInvitesDialog = ({ open, onOpenChange, workspaceId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingUser[] | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ sent: number; errors: number } | null>(null);

  const loadPending = async () => {
    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-bulk-invites', {
        body: { workspace_id: workspaceId, dry_run: true },
      });
      if (error) throw error;
      setPending((data as any)?.pending || []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar pendentes', description: err.message, variant: 'destructive' });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const dispatch = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-bulk-invites', {
        body: { workspace_id: workspaceId, dry_run: false },
      });
      if (error) throw error;
      const summary = (data as any)?.summary;
      setResults({ sent: summary?.sent ?? 0, errors: summary?.errors ?? 0 });
      toast({
        title: 'Convites disparados',
        description: `${summary?.sent ?? 0} enviados, ${summary?.errors ?? 0} erros`,
      });
    } catch (err: any) {
      toast({ title: 'Erro ao disparar', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // Load pending when opened
  if (open && pending === null && !loading) {
    loadPending();
  }

  const handleClose = (next: boolean) => {
    if (!next) {
      setPending(null);
      setResults(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Disparar convites pendentes</DialogTitle>
          <DialogDescription>
            Envia o e-mail de boas-vindas para todos os usuários do workspace que ainda não fizeram login.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
            <p className="font-medium">{results.sent} convites enviados</p>
            {results.errors > 0 && (
              <p className="text-sm text-amber-600">{results.errors} com erro — confira logs</p>
            )}
          </div>
        ) : pending && pending.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum convite pendente.</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1.5 py-2">
            {pending?.map((p) => (
              <div key={p.email} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.full_name || p.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{p.role}</Badge>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={sending}>
            {results ? 'Fechar' : 'Cancelar'}
          </Button>
          {!results && pending && pending.length > 0 && (
            <Button onClick={dispatch} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar {pending.length} convite{pending.length === 1 ? '' : 's'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
