import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '@/contexts/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { EmptyStateHero } from '@/components/EmptyStateHero';
import { AnalyticsContent } from '@/pages/Analytics';
import { BulkOnboardDialog } from '@/components/admin/BulkOnboardDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, BarChart3, MailPlus, UserPlus, Mail, Send, Loader2 } from 'lucide-react';
import { MembersGrid } from '@/components/leader/MembersGrid';

function MembersTab() {
  return <MembersGrid />;
}

function TeamsTab() {
  const { workspaceId } = useAccount();
  const { data: teams, isLoading } = useQuery({
    queryKey: ['workspace-teams', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, leader_user_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando times...</div>;
  if (!teams?.length) {
    return (
      <EmptyStateHero
        icon={Building2}
        title="Nenhum time ainda"
        description="Times agrupam liderados por squad, área ou projeto. Crie o primeiro para organizar a operação."
        ctaLabel="Em breve"
      />
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {teams.map((t) => (
        <Card key={t.id} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-base font-serif tracking-tight">{t.name}</CardTitle>
            <CardDescription className="text-xs">Líder: {t.leader_user_id?.slice(0, 8) ?? '—'}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function ResendInviteButton({ memberId, memberName, memberEmail }: { memberId: string; memberName: string; memberEmail: string | null }) {
  const [sending, setSending] = useState(false);
  const handleResend = async () => {
    if (!memberEmail) {
      toast.error('Esse liderado não tem e-mail cadastrado.');
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const leaderName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? '';
      const syncUrl = `${window.location.origin}/sync/${memberId}`;
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'member-welcome',
          recipientEmail: memberEmail,
          // sufixo com timestamp pra permitir reenvio (idempotência por envio único era um bug)
          idempotencyKey: `member-welcome-${memberId}-resend-${Date.now()}`,
          templateData: {
            memberName,
            leaderName,
            teamName: '',
            syncUrl,
          },
        },
      });
      if (error) throw error;
      toast.success(`Convite reenviado para ${memberEmail}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao reenviar: ${msg}`);
    } finally {
      setSending(false);
    }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={handleResend} disabled={sending}>
      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
      Reenviar
    </Button>
  );
}

function InvitesTab({ onInvite }: { onInvite: () => void }) {
  const queryClient = useQueryClient();
  const { data: pending } = useQuery({
    queryKey: ['pending-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, created_at')
        .eq('invite_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold tracking-tight">Convites pendentes</h2>
          <p className="text-sm text-muted-foreground">
            {pending?.length ?? 0} liderado(s) ainda não aceitaram o convite.
          </p>
        </div>
        <Button onClick={onInvite} className="rounded-xl gap-2">
          <UserPlus className="w-4 h-4" /> Convidar liderados
        </Button>
      </div>

      {!pending?.length ? (
        <EmptyStateHero
          icon={MailPlus}
          title="Sem convites pendentes"
          description="Adicione liderados em massa colando uma lista de e-mails. Cada um recebe um convite personalizado."
          ctaLabel="Convidar liderados"
          ctaIcon={UserPlus}
          onCta={onInvite}
          variant="compact"
        />
      ) : (
        <div className="space-y-2">
          {pending.map((p) => (
            <Card key={p.id} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
              <CardContent className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-xl bg-primary/10 p-2 shrink-0"><Mail className="w-4 h-4 text-primary" /></div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email ?? 'sem e-mail'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs hidden sm:inline-flex">Pendente</Badge>
                  <ResendInviteButton memberId={p.id} memberName={p.name} memberEmail={p.email} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LiderPessoas() {
  const { isHRAdmin, workspaceId } = useAccount();
  const [inviteOpen, setInviteOpen] = useState(false);

  const tabs: PageTab[] = [
    { value: 'membros', label: 'Membros', icon: Users, content: <MembersTab /> },
    { value: 'times', label: 'Times', icon: Building2, hidden: !isHRAdmin, content: <TeamsTab /> },
    { value: 'analytics', label: 'Analytics', icon: BarChart3, content: <AnalyticsContent /> },
    { value: 'convites', label: 'Convites', icon: MailPlus, content: <InvitesTab onInvite={() => setInviteOpen(true)} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Pessoas</h1>
        <p className="text-muted-foreground text-sm mt-1">Liderados, times, analytics e convites.</p>
      </header>
      <PageTabs tabs={tabs} defaultValue="membros" />
      <BulkOnboardDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceNames={workspaceId ? [workspaceId] : []}
      />
    </div>
  );
}
