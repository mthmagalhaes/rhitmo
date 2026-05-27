import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { BulkOnboardDialog } from '@/components/admin/BulkOnboardDialog';
import { UserPlus, Upload } from 'lucide-react';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Input } from '@/components/ui/input';
import { MemberProfileSheet } from '@/components/hr/MemberProfileSheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Users, CheckCircle2, Calendar, Loader2, UserCheck, Sparkles } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { HRUpgradeGate } from '@/components/hr/HRUpgradeGate';


const ITEMS_PER_PAGE = 20;

const getActivityBadge = (days: number) => {
  if (days <= 7) return { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (days <= 30) return { label: `${days}d atrás`, className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (days <= 60) return { label: `${days}d atrás`, className: 'bg-orange-100 text-orange-700 border-orange-200' };
  return { label: 'Sem feedback', className: 'bg-red-100 text-red-700 border-red-200' };
};

export default function HRMembers() {
  const { workspaceId, workspaceName } = useHRAdmin();
  const { hasHrDashboard, isLoading: planLoading } = usePlanLimits();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  if (!planLoading && !hasHrDashboard) {
    return <HRUpgradeGate title="Liderados exigem Enterprise" description="A gestão completa de liderados por RH Admin fica disponível no upgrade Enterprise." />;
  }
  const [selectedLeader, setSelectedLeader] = useState('all');
  const [pdiFilter, setPdiFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const { data: leadersData } = useQuery({
    queryKey: ['hr-leaders', workspaceId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_hr_leaders_overview', { _workspace_id: workspaceId });
      return data as any;
    },
    enabled: !!workspaceId,
  });

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['hr-members', workspaceId, search, selectedLeader, pdiFilter, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_all_members', {
        _workspace_id: workspaceId,
        _search: search || null,
        _leader_id: selectedLeader === 'all' ? null : selectedLeader,
        _has_pdi: pdiFilter === 'all' ? null : pdiFilter === 'with_pdi',
        _limit: ITEMS_PER_PAGE,
        _offset: page * ITEMS_PER_PAGE,
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!workspaceId,
  });

  const members = membersData || [];
  const totalCount = members[0]?.total_count || 0;
  const totalPages = Math.ceil(Number(totalCount) / ITEMS_PER_PAGE);
  const leaders = (leadersData as any)?.leaders || [];

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liderados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão completa de todos os colaboradores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" /> Importar em massa
          </Button>
          <Button className="rounded-xl gap-2" onClick={() => setNewMemberOpen(true)}>
            <UserPlus className="h-4 w-4" /> Convidar liderado
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>

        <Select value={selectedLeader} onValueChange={(v) => { setSelectedLeader(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Líder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os líderes</SelectItem>
            {leaders.map((l: any) => (
              <SelectItem key={l.leader_id} value={l.leader_id}>
                {l.leader_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pdiFilter} onValueChange={(v) => { setPdiFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="PDI" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with_pdi">Com PDI</SelectItem>
            <SelectItem value="without_pdi">Sem PDI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhum liderado encontrado</p>
          </div>
        ) : (
          members.map((member: any) => {
            const badge = getActivityBadge(member.days_since_last_feedback);
            return (
              <Card
                key={member.member_id}
                className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.07)]"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {member.member_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{member.member_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.member_email}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Líder: {member.leader_name || 'Não atribuído'}
                      </p>
                    </div>
                  </div>

                  {/* Badges + action */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {member.invite_status && member.invite_status !== 'accepted' && (
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5 gap-1 bg-amber-50 text-amber-700 border-amber-200">
                        <Calendar className="h-3 w-3" />
                        Aguardando aceite
                      </Badge>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${badge.className}`}>
                        {badge.label}
                      </Badge>
                    </div>

                    {member.has_sync && (
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5 gap-1 bg-violet-50 text-violet-700 border-violet-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Sync
                      </Badge>
                    )}

                    {member.pdi_count > 0 && (
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                        {member.pdi_count} PDI
                      </Badge>
                    )}

                    {member.has_skills_map && (
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5 gap-1 bg-teal-50 text-teal-700 border-teal-200">
                        <Sparkles className="h-3 w-3" />
                        Skills
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground ml-auto"
                      onClick={() => {
                        setSelectedMemberId(member.member_id);
                        setProfileSheetOpen(true);
                      }}
                    >
                      Ver Perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, Number(totalCount))} de {Number(totalCount)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Próxima
            </Button>
          </div>
        </div>
      )}
      <MemberProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        memberId={selectedMemberId || ''}
        workspaceId={workspaceId}
      />
      <NewMemberDialog
        open={newMemberOpen}
        onOpenChange={setNewMemberOpen}
        workspaceId={workspaceId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['hr-members', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['hr-leaders', workspaceId] });
        }}
      />
      <BulkOnboardDialog
        open={bulkOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['hr-members', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['hr-leaders', workspaceId] });
          }
        }}
        workspaceNames={workspaceName ? [workspaceName] : []}
      />
    </div>
  );
}
