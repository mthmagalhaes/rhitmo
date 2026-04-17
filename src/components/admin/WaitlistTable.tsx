import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ClipboardList, Loader2, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { PlanTier } from '@/types/team';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

export const WaitlistTable = () => {
  const { toast } = useToast();
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [inviteDialog, setInviteDialog] = useState<{
    open: boolean; email: string; name: string | null; plan: PlanTier; isResend: boolean;
  }>({ open: false, email: '', name: null, plan: 'pulse', isResend: false });

  const { data: leads, isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ['admin-waitlist-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const openInviteDialog = (email: string, name: string | null, isResend: boolean) => {
    setInviteDialog({ open: true, email, name, plan: 'pulse', isResend });
  };

  const confirmInvite = async () => {
    const { email, name, plan } = inviteDialog;
    setInvitingEmail(email);
    setInviteDialog((prev) => ({ ...prev, open: false }));
    try {
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: { email, name, assigned_plan: plan },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const planNames: Record<PlanTier, string> = { pulse: 'Pulse', pro: 'Pro', business: 'Business' };
      toast({ title: 'Convite enviado!', description: `${email} receberá o link com plano ${planNames[plan]}.` });
      refetchLeads();
    } catch (error: any) {
      toast({ title: 'Erro ao convidar', description: error.message, variant: 'destructive' });
    } finally {
      setInvitingEmail(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Lista de Espera
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leads && leads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Team Size</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: any) => (
                  <TableRow key={lead.email}>
                    <TableCell className="font-medium">
                      {lead.name || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      {lead.team_size ? (
                        <Badge variant="outline">{lead.team_size}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={lead.status === 'invited' ? 'default' : 'secondary'}>
                        {lead.status === 'invited' ? 'Convidado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={lead.status === 'invited' ? 'outline' : 'default'}
                        onClick={() => openInviteDialog(lead.email, lead.name, lead.status === 'invited')}
                        disabled={invitingEmail === lead.email}
                      >
                        {invitingEmail === lead.email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : lead.status === 'invited' ? (
                          <><RefreshCw className="h-4 w-4 mr-2" />Reenviar</>
                        ) : (
                          <><Mail className="h-4 w-4 mr-2" />Aprovar & Convidar</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhum lead na lista de espera</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteDialog.open} onOpenChange={(open) => setInviteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inviteDialog.isResend ? 'Reenviar Convite' : 'Aprovar Acesso'}</DialogTitle>
            <DialogDescription>
              {inviteDialog.isResend ? `Reenviar convite para ${inviteDialog.email}` : 'Selecione o plano inicial.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano Inicial</Label>
              <Select
                value={inviteDialog.plan}
                onValueChange={(v) => setInviteDialog((prev) => ({ ...prev, plan: v as PlanTier }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulse">🎵 Pulse (Gratuito)</SelectItem>
                  <SelectItem value="pro">💼 Pro</SelectItem>
                  <SelectItem value="business">🏢 Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog((prev) => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={confirmInvite}>
              <Mail className="h-4 w-4 mr-2" />Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
