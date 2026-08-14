// Hub de Setup da Empresa — uma única tela para HR Admin / Owner / Super Admin
// montar a empresa: cadastrar times 1 a 1 (wizard), importar planilha (CSV),
// ou disparar um convite avulso. Resolve a confusão de 3 entradas paralelas
// que travou o Guto (Faster Ops).
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Sparkles, FileSpreadsheet, UserPlus, Users, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BulkOnboardDialog } from '@/components/admin/BulkOnboardDialog';
import { OneByOneWizard } from '@/components/setup/OneByOneWizard';
import { LeaderPicker, type LeaderCandidate } from '@/components/teams/LeaderPicker';

interface Stats { teams: number; leaders: number; members: number }

export default function CompanySetup() {
  const { workspaceId, isHRAdmin, isWorkspaceOwner, loading } = useAccount();
  const { isAdmin: isSuperAdmin } = useAdmin();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLeader, setInviteLeader] = useState<LeaderCandidate | null>(null);

  const { data: workspace } = useQuery({
    queryKey: ['setup-workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data } = await supabase.from('workspaces').select('id, name').eq('id', workspaceId).maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['setup-stats', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { teams: 0, leaders: 0, members: 0 };
      const { data: teams } = await supabase.from('teams').select('id, leader_user_id').eq('workspace_id', workspaceId);
      const teamIds = (teams ?? []).map(t => t.id);
      const leaderIds = new Set((teams ?? []).map(t => t.leader_user_id).filter(Boolean));
      let members = 0;
      if (teamIds.length > 0) {
        const { count } = await supabase.from('team_members').select('id', { count: 'exact', head: true }).in('team_id', teamIds).is('archived_at', null);
        members = count ?? 0;
      }
      return { teams: teams?.length ?? 0, leaders: leaderIds.size, members };
    },
    enabled: !!workspaceId,
  });

  const workspaceNames = useMemo(() => workspace?.name ? [workspace.name] : [], [workspace]);

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  if (!isHRAdmin && !isWorkspaceOwner && !isSuperAdmin) return <Navigate to="/" replace />;
  if (!workspaceId || !workspace) return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Workspace não encontrado.</div>;

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
            <Building2 className="h-3.5 w-3.5" /> Setup da Empresa
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">
            Monte a estrutura da empresa: times, líderes e liderados. Os e-mails de convite são disparados depois, em "Disparar convites".
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Times', value: stats?.teams ?? 0, Icon: Users },
            { label: 'Líderes', value: stats?.leaders ?? 0, Icon: UserCog },
            { label: 'Liderados', value: stats?.members ?? 0, Icon: UserPlus },
          ].map(({ label, value, Icon }) => (
            <Card key={label} className="p-4 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/50">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
            </Card>
          ))}
        </div>

        {/* Action cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/50 hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => setWizardOpen(true)}>
            <Sparkles className="h-5 w-5 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Cadastro 1 a 1</h3>
            <p className="text-xs text-muted-foreground mb-4">Wizard guiado: Time → Líder → Liderados. Recomendado para a primeira configuração.</p>
            <Button size="sm" className="w-full rounded-xl">Começar wizard</Button>
          </Card>

          <Card className="p-5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/50 hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => setBulkOpen(true)}>
            <FileSpreadsheet className="h-5 w-5 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Importar planilha</h3>
            <p className="text-xs text-muted-foreground mb-4">CSV com todos times, líderes e liderados de uma vez. Bom para empresas grandes.</p>
            <Button size="sm" variant="outline" className="w-full rounded-xl">Importar CSV</Button>
          </Card>

          <Card className="p-5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/50 hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => { setInviteLeader(null); setInviteOpen(true); }}>
            <UserPlus className="h-5 w-5 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Convidar líder avulso</h3>
            <p className="text-xs text-muted-foreground mb-4">Atalho rápido para enviar um único convite sem passar pelo wizard.</p>
            <Button size="sm" variant="outline" className="w-full rounded-xl">Convidar líder</Button>
          </Card>
        </div>
      </div>

      <OneByOneWizard open={wizardOpen} onOpenChange={setWizardOpen} workspaceId={workspaceId} workspaceName={workspace.name} />
      <BulkOnboardDialog open={bulkOpen} onOpenChange={setBulkOpen} workspaceNames={workspaceNames} />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar líder</DialogTitle>
            <DialogDescription>Envie um convite avulso. Você pode atribuir o líder a um time depois.</DialogDescription>
          </DialogHeader>
          <LeaderPicker workspaceId={workspaceId} value={inviteLeader} onChange={(v) => { setInviteLeader(v); if (v?.pending) setInviteOpen(false); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
