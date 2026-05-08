// Sprint 12.1 — Master list disciplinada estilo Windmill.
// - Header neutro "Liderados · N" (nunca o nome da página)
// - Filtro de times via Select compacto (não vaza)
// - Footer "Novo liderado" como item de menu sutil
import { useState, type ReactNode } from 'react';
import { Loader2, Menu, UserPlus, Users } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MemberAvatar } from '@/components/MemberAvatar';
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
  /**
   * Deprecated: o título da página NUNCA vive na master list.
   * Mantido para compat, mas ignorado.
   */
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

interface InnerListProps extends Omit<MemberMasterListProps, 'title'> {
  members: LeaderMemberRow[];
  isLoading: boolean;
  activeTeamId: string | null;
  onTeamChange: (id: string | null) => void;
  teams: ReturnType<typeof useLeaderMembers>['teams'];
  onAddMember: () => void;
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
}: InnerListProps) {
  const filtered = activeTeamId
    ? members.filter((m) => m.team_id === activeTeamId)
    : members;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Liderados
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          {filtered.length} {filtered.length === 1 ? 'pessoa' : 'pessoas'}
        </p>
      </div>

      {showTeamFilter && teams.length > 1 && (
        <div className="px-2 pb-2">
          <Select
            value={activeTeamId ?? 'all'}
            onValueChange={(v) => onTeamChange(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-7 rounded-lg text-[11px] bg-background/60 border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os times</SelectItem>
              {teams
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
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
          <ul className="py-0.5">
            {filtered.map((m) => {
              const isActive = m.id === selectedMemberId;
              const health = getHealth(m.last_feedback_date);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors border-l-2 border-transparent',
                      'hover:bg-muted/60',
                      isActive && 'bg-primary/10 border-l-primary',
                    )}
                  >
                    <div className="relative shrink-0">
                      <MemberAvatar
                        memberId={m.id}
                        memberName={m.name}
                        avatarUrl={m.avatar}
                        size="sm"
                      />
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background',
                          HEALTH_CLASSES[health],
                        )}
                        aria-label={`Saúde: ${health}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate text-foreground leading-tight">
                        {m.name}
                      </p>
                      {m.role && (
                        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
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
        <div className="px-2 py-2 border-t border-border/40">
          <button
            type="button"
            onClick={onAddMember}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Novo liderado
          </button>
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

  const innerProps = {
    selectedMemberId: props.selectedMemberId,
    onSelect: props.onSelect,
    renderBadge: props.renderBadge,
    members,
    isLoading,
    teams,
    activeTeamId,
    onTeamChange: setActiveTeamId,
    showTeamFilter,
    showNewMemberCta,
    onAddMember: () => {
      setMobileOpen(false);
      setNewMemberOpen(true);
    },
  };

  return (
    <>
      {/* Desktop: sticky sidebar — full app height, denser, soft contrast vs main */}
      <aside data-tour="member-list" className="hidden lg:flex shrink-0 w-[260px] sticky top-0 self-start h-[calc(100svh-3rem)] border-r border-border/40 bg-muted/30">
        <InnerList {...innerProps} />
      </aside>

      {/* Mobile: trigger + Sheet */}
      <div className="lg:hidden flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl gap-2">
              <Menu className="h-4 w-4" />
              Liderados
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Liderados</SheetTitle>
            </SheetHeader>
            <div className="h-full flex flex-col">
              <InnerList
                {...innerProps}
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
