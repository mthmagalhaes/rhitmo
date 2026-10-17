// /lider/avaliacoes — master-detail com transição deslizante entre a visão do time
// e o detalhe do liderado. Deep-link via /lider/avaliacoes/:memberId.
import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { useTeamReviewsSummary } from '@/hooks/useTeamReviewsSummary';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { ReviewsCoverageInsight } from '@/components/leader/avaliacoes/ReviewsCoverageInsight';
import { ReviewsCrossMemberTable } from '@/components/leader/avaliacoes/ReviewsCrossMemberTable';
import { ReviewsMemberDetail } from '@/components/leader/avaliacoes/ReviewsMemberDetail';
import { CreateFormalReviewDialog } from '@/components/review/CreateFormalReviewDialog';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LiderAvaliacoes() {
  const navigate = useNavigate();
  const { memberId: routeMemberId } = useParams<{ memberId?: string }>();
  const { members, teams, workspace, isLoading: membersLoading } = useLeaderMembers();
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { summaryByMember, isLoading: summaryLoading } = useTeamReviewsSummary(memberIds);
  const tableLoading = membersLoading || (memberIds.length > 0 && summaryLoading);
  const reduce = useReducedMotion();

  const [formalMember, setFormalMember] = useState<LeaderMemberRow | null>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);

  const selected = useMemo(
    () => members.find((m) => m.id === routeMemberId) ?? null,
    [members, routeMemberId],
  );

  const goToMember = (m: LeaderMemberRow) => {
    if (!selected && scrollRef.current) savedScroll.current = scrollRef.current.scrollTop;
    navigate(`/lider/avaliacoes/${m.id}`);
  };
  const clearSelection = () => navigate('/lider/avaliacoes');

  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = selected ? 0 : savedScroll.current;
  }, [selected?.id]);

  const d = reduce ? 0 : 0.35;

  return (
    <div className="flex h-[calc(100svh-3rem)] overflow-hidden">
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="master"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: d, ease: EASE }}
            className="flex"
          >
            <MemberMasterList selectedMemberId={selected.id} onSelect={goToMember} />
          </motion.div>
        )}
      </AnimatePresence>

      <section ref={scrollRef} data-tour="reviews-list" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div
              key={`member-${selected.id}`}
              initial={{ x: 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: d, ease: EASE }}
            >
              <ReviewsMemberDetail
                member={selected}
                onCreateFormal={() => setFormalMember(selected)}
                onClose={clearSelection}
              />
            </motion.div>
          ) : (
            <motion.div
              key="overview"
              initial={{ x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              transition={{ duration: d, ease: EASE }}
              className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-6"
            >
              <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 shadow-[0_2px_28px_rgba(0,0,0,0.05)]">
                <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
                <div className="relative max-w-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <h1 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                    Avaliações do time
                  </h1>
                  <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                    Clique em "Nova formal" para avaliar alguém agora, ou na linha para ver o histórico do liderado.
                  </p>
                </div>
              </section>

              <ReviewsCrossMemberTable
                members={members}
                teams={teams}
                summaryByMember={summaryByMember}
                onOpenMember={goToMember}
                onCreateFormal={(m) => setFormalMember(m)}
                loading={tableLoading}
              />

              {!tableLoading && <ReviewsCoverageInsight
                members={members}
                summaryByMember={summaryByMember}
                onPickMember={goToMember}
              />}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {workspace?.id && (
        <CreateFormalReviewDialog
          open={!!formalMember}
          onOpenChange={(o) => { if (!o) setFormalMember(null); }}
          member={
            formalMember
              ? { id: formalMember.id, name: formalMember.name, role: formalMember.role ?? '' }
              : null
          }
          workspaceId={workspace.id}
          onReviewCreated={() => setFormalMember(null)}
        />
      )}
    </div>
  );
}
