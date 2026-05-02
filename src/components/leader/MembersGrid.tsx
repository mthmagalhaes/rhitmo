import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { supabase } from '@/integrations/supabase/client';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { TeamTabs } from '@/components/TeamTabs';
import { Button } from '@/components/ui/button';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { Workspace, Team } from '@/types/team';

interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  performance_score: number;
  created_at: string;
  feedback_count?: number;
  last_feedback_date?: string;
  team_id?: string | null;
  email?: string | null;
  linked_user_id?: string | null;
  invite_status?: string | null;
  invite_token?: string | null;
}

export interface MembersGridProps {
  /** Page eyebrow / kicker shown above the title (small uppercase). */
  eyebrow?: string;
  /** Section title (h2). Falls back to "Selecione um liderado". */
  title?: string;
  /** Subtitle / helper text under the title. */
  subtitle?: string;
  /**
   * Behavior when a card is clicked.
   * - `navigate` (default): goes to /member/:id
   * - `select`: calls onMemberSelect instead of navigating
   */
  mode?: 'navigate' | 'select';
  onMemberSelect?: (member: { id: string; name: string }) => void;
  /** Show the team filter tabs (default true). */
  showTeamFilter?: boolean;
  /** Show "Novo Membro" CTA in the header (default true). */
  showNewMemberCta?: boolean;
}

/**
 * Tako-style liderados grid. Self-contained: fetches workspace, teams and members
 * for the effective user. Used by Diário, Objetivos, Avaliações and 1:1s host pages
 * so they don't have to render the whole dashboard ("Bom dia, …" banner).
 */
export function MembersGrid({
  eyebrow,
  title,
  subtitle,
  mode = 'navigate',
  onMemberSelect,
  showTeamFilter = true,
  showNewMemberCta = true,
}: MembersGridProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: effectiveUserId } = useEffectiveUser();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [newMemberOpen, setNewMemberOpen] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data: owned } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', effectiveUserId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (owned) return owned as Workspace;
      const { data: leaderTeam } = await supabase
        .from('teams')
        .select('workspace_id')
        .eq('leader_user_id', effectiveUserId)
        .limit(1)
        .maybeSingle();
      if (!leaderTeam?.workspace_id) return null;
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', leaderTeam.workspace_id)
        .eq('is_active', true)
        .maybeSingle();
      return ws as Workspace | null;
    },
    enabled: !!effectiveUserId,
    staleTime: 30_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Team[];
    },
    enabled: !!workspace,
    staleTime: 30_000,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data: rows, error } = await supabase
        .from('team_members')
        .select('*, teams!inner(workspace_id)')
        .eq('teams.workspace_id', workspace.id)
        .order('name');
      if (error) throw error;
      const ids = (rows ?? []).map((m: { id: string }) => m.id);
      const { data: feedbacks } = await supabase
        .from('feedbacks')
        .select('member_id, created_at')
        .in('member_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      return (rows ?? []).map((m: TeamMemberRow) => {
        const fb = (feedbacks ?? []).filter((f) => f.member_id === m.id);
        const last = fb.length
          ? fb.sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )[0].created_at
          : m.created_at;
        return { ...m, feedback_count: fb.length, last_feedback_date: last };
      }) as TeamMemberRow[];
    },
    enabled: !!workspace,
    staleTime: 30_000,
  });

  const filtered = useMemo(
    () => (activeTeamId ? members.filter((m) => m.team_id === activeTeamId) : members),
    [members, activeTeamId],
  );

  const handleClick = (m: TeamMemberRow) => {
    if (mode === 'select') {
      onMemberSelect?.({ id: m.id, name: m.name });
      return;
    }
    navigate(`/member/${m.id}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
              {eyebrow}
            </p>
          )}
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            {title ?? t('membersGrid.defaultTitle', 'Selecione um liderado')}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {showNewMemberCta && workspace && (
          <Button
            onClick={() => setNewMemberOpen(true)}
            variant="outline"
            className="rounded-full h-10 gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>{t('dashboard.newMember', 'Novo Membro')}</span>
          </Button>
        )}
      </header>

      {showTeamFilter && teams.length > 0 && (
        <TeamTabs
          teams={teams}
          activeTeamId={activeTeamId}
          onTeamChange={setActiveTeamId}
          onNewTeam={() => {/* gerenciado em /lider/pessoas */}}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card border border-dashed border-border p-10 text-center">
          <Users className="h-7 w-7 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {members.length === 0
              ? t('membersGrid.empty', 'Nenhum liderado cadastrado ainda.')
              : t('membersGrid.emptyInTeam', 'Nenhum liderado neste time.')}
          </p>
          {members.length === 0 && workspace && (
            <Button
              onClick={() => setNewMemberOpen(true)}
              className="rounded-full px-6"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('dashboard.addFirstMember', 'Adicionar primeiro liderado')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((m) => (
            <TeamMemberCard
              key={m.id}
              // The TeamMemberCard expects an "as any" shape (legacy types).
              // We pass the same fields the dashboard uses.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              member={{
                id: m.id,
                name: m.name,
                role: m.role,
                avatar: m.avatar || null,
                lastFeedback: m.last_feedback_date || m.created_at,
                feedbackCount: m.feedback_count || 0,
                performanceScore: m.performance_score,
                teamId: m.team_id ?? undefined,
                linked_user_id: m.linked_user_id,
                email: m.email,
                invite_status: m.invite_status,
                invite_token: m.invite_token,
              } as any}
              teamName={teams.find((t) => t.id === m.team_id)?.name}
              onClick={() => handleClick(m)}
            />
          ))}
        </div>
      )}

      {workspace && (
        <NewMemberDialog
          open={newMemberOpen}
          onOpenChange={setNewMemberOpen}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}
