// Sprint 20 — /lider/avaliacoes redesenhado como master-detail nativo.
// - Sidebar fixa 260px (MemberMasterList) — igual /lider/1on1s e /lider/diario
// - Detalhe do liderado ocupa a área principal com Rhitmo Formal em primeiro plano
// - Sem sheet lateral; deep-link via /lider/avaliacoes/:memberId
// - Empty state (nenhum liderado escolhido) exibe visão cross-member do time
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { useTeamReviewsSummary } from '@/hooks/useTeamReviewsSummary';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { ReviewsCoverageInsight } from '@/components/leader/avaliacoes/ReviewsCoverageInsight';
import { ReviewsCrossMemberTable } from '@/components/leader/avaliacoes/ReviewsCrossMemberTable';
import { ReviewsMemberDetail } from '@/components/leader/avaliacoes/ReviewsMemberDetail';
import { CreateFormalReviewDialog } from '@/components/review/CreateFormalReviewDialog';
import { useState } from 'react';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderAvaliacoes() {
  const navigate = useNavigate();
  const { memberId: routeMemberId } = useParams<{ memberId?: string }>();
  const { members, teams, workspace } = useLeaderMembers();
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { summaryByMember } = useTeamReviewsSummary(memberIds);

  const [formalMember, setFormalMember] = useState<LeaderMemberRow | null>(null);

  const selected = useMemo(
    () => members.find((m) => m.id === routeMemberId) ?? null,
    [members, routeMemberId],
  );

  const goToMember = (m: LeaderMemberRow) => navigate(`/lider/avaliacoes/${m.id}`);
  const clearSelection = () => navigate('/lider/avaliacoes');

  return (
    <div className="flex h-[calc(100svh-3rem)] overflow-hidden">
      <MemberMasterList
        selectedMemberId={selected?.id ?? null}
        onSelect={goToMember}
      />

      <main data-tour="reviews-list" className="flex-1 overflow-y-auto">
        {selected ? (
          <ReviewsMemberDetail
            member={selected}
            onCreateFormal={() => setFormalMember(selected)}
            onClose={clearSelection}
          />
        ) : (
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-6">
            <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 lg:p-10 shadow-[0_2px_28px_rgba(0,0,0,0.05)]">
              <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="relative max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Rhitmo Formal
                  </p>
                </div>
                <h1 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                  Ciclos formais do time
                </h1>
                <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                  Estado do Rhitmo Formal e do Acompanhamento Mensal em uma única visão.
                  Escolha um liderado à esquerda para abrir o ciclo dele em tela cheia.
                </p>
              </div>
            </section>

            <ReviewsCrossMemberTable
              members={members}
              teams={teams}
              summaryByMember={summaryByMember}
              onOpenMember={goToMember}
              onCreateFormal={(m) => setFormalMember(m)}
            />

            <ReviewsCoverageInsight
              members={members}
              summaryByMember={summaryByMember}
              onPickMember={goToMember}
            />
          </div>
        )}
      </main>

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
