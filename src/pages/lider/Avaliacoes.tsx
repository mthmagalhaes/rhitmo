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
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6 space-y-5">
            <header className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Rhitmo Formal
                </p>
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">
                Ciclos formais do time
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                Estado do Rhitmo Formal e do Acompanhamento Mensal do time em uma única
                visão. Escolha um liderado à esquerda para abrir o ciclo dele em tela cheia.
              </p>
            </header>

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
