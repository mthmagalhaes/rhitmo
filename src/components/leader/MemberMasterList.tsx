// Sprint 12 — Master list for leader Master-Detail pages (1:1s, Diário, Objetivos).
// Renders a sticky vertical list of liderados with health dots and a `Sheet`
// fallback for mobile. Selection is fully controlled by the parent page.
import { useState, type ReactNode } from 'react';
import { Loader2, Menu, UserPlus, Users } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MemberAvatar } from '@/components/MemberAvatar';
import { TeamTabs } from '@/components/TeamTabs';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { cn } from '@/lib/utils';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';

export interface MemberMasterListProps {
  selectedMemberId: string | null;
  onSelect: (member: LeaderMemberRow) => void;
  /** Optional content rendered inside each row (right side, e.g. badges). */
  renderBadge?: (member: LeaderMemberRow) => ReactNode;
  /** Hide the team filter (defaults to true if there are 2+ teams). */
  showTeamFilter?: boolean;
  /** Show the "Novo liderado" footer button. */
  showNewMemberCta?: boolean;
  /** Title rendered above the list. */
  title?: string;
}

const HEALTH_CLASSES: Record<'fresh' | 'warm' | 'cold', string> = {
  fresh: 'bg-emerald-500',
  warm: 'bg-amber-500',
  cold: 'bg-rose-500',
};

function getHealth(lastFeedbackIso: string): keyof typeof HEALTH_CLASSES {
  const days = differenceInDays(new Date(), new Date(lastFeedbackIso));
  if (days <= 7) return 'fresh';
  if (days <= 14) return 'warm';
  return 'cold';
}

interface InnerListProps extends MemberMasterListProps {
  members: LeaderMemberRow[];
  isLoading: boolean;
  activeTeamId: string | null;
  onTeamChange: (id: string | null) => void;
  teams: ReturnType<typeof useLeaderMembers>['teams'];
  onAddMember: () => void;
  showHeader?: boolean;
}

function InnerList({
  members,
  isLoading,
  activeTeamId,
  onTeamChange,
  teams,
  selectedMemberId,
  onSelect,
  renderBadge,
  showTeamFilter,
  showNewMemberCta,
  onAddMember,
  title,
  showHeader = true,
}: InnerListProps) {
  const filtered = activeTeamId
    ? members.filter((m) => m.team_id === activeTeamId)
    : members;

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
        <div className="px-4 pt-5 pb-3 border-b border-border/40">
          <h2 className="font-serif text-lg font-bold tracking-tight">
            {title ?? 'Liderados'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'pessoa' : 'pessoas'}
          </p>
        </div>
      )}

      {showTeamFilter && teams.length > 1 && (
        <div className="px-3 pt-3">
          <TeamTabs
            teams={teams}
            activeTeamId={activeTeamId}
            onTeamChange={onTeamChange}
            onNewTeam={() => {
              /* gerenciado em /lider/pessoas */
            }}
          />
        </div>
      )}

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">
              {members.length === 0
                ? 'Nenhum liderado cadastrado ainda.'
                : 'Nenhum liderado neste time.'}
            </p>
          </div>
        ) : (
          <ul className="py-2">
            {filtered.map((m) => {
              const isActive = m.id === selectedMemberId;
              const health = getHealth(m.last_feedback_date);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2 border-transparent',
                      'hover:bg-muted/60',
                      isActive && 'bg-primary/10 border-l-primary',
                    )}
                  >
                    <div className="relative shrink-0">
                      <MemberAvatar
                        memberId={m.id}
                        memberName={m.name}
                        avatarUrl={m.avatar}
                        size="md"
                      />
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background',
                          HEALTH_CLASSES[health],
                        )}
                        aria-label={`Saúde: ${health}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {m.name}
                      </p>
                      {m.role && (
                        <p className="text-xs text-muted-foreground truncate">
                          {m.role}
                        </p>
                      )}
                    </div>
                    {renderBadge && (
                      <div className="shrink-0">{renderBadge(m)}</div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      {showNewMemberCta && (
        <div className="px-3 py-3 border-t border-border/40">
          <Button
            onClick={onAddMember}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-xl"
          >
            <UserPlus className="h-4 w-4" />
            Novo liderado
          </Button>
        </div>
      )}
    </div>
  );
}

export function MemberMasterList(props: MemberMasterListProps) {
  const { workspace, teams, members, isLoading } = useLeaderMembers();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const showTeamFilter = props.showTeamFilter ?? true;
  const showNewMemberCta = props.showNewMemberCta ?? !!workspace;

  const inner = (
    <InnerList
      {...props}
      members={members}
      isLoading={isLoading}
      teams={teams}
      activeTeamId={activeTeamId}
      onTeamChange={setActiveTeamId}
      onAddMember={() => {
        setMobileOpen(false);
        setNewMemberOpen(true);
      }}
      showTeamFilter={showTeamFilter}
      showNewMemberCta={showNewMemberCta}
    />
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:flex shrink-0 w-[320px] sticky top-0 self-start h-[calc(100vh-4rem)] border-r border-border/40 bg-card/40">
        {inner}
      </aside>

      {/* Mobile: trigger + Sheet */}
      <div className="lg:hidden mb-4 flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl gap-2">
              <Menu className="h-4 w-4" />
              Liderados
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Liderados</SheetTitle>
            </SheetHeader>
            <div className="h-full flex flex-col">
              <InnerList
                {...props}
                members={members}
                isLoading={isLoading}
                teams={teams}
                activeTeamId={activeTeamId}
                onTeamChange={setActiveTeamId}
                onAddMember={() => {
                  setMobileOpen(false);
                  setNewMemberOpen(true);
                }}
                showTeamFilter={showTeamFilter}
                showNewMemberCta={showNewMemberCta}
                onSelect={(m) => {
                  props.onSelect(m);
                  setMobileOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {workspace && (
        <NewMemberDialog
          open={newMemberOpen}
          onOpenChange={setNewMemberOpen}
          workspaceId={workspace.id}
        />
      )}
    </>
  );
}
