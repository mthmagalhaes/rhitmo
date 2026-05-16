// Sprint 19 — Avaliações cross-member estilo Diário/Pessoas.
// Insight de cobertura + tabela densa (1 linha por liderado) + sheet lateral.
import { useMemo, useState } from 'react';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { useTeamReviewsSummary } from '@/hooks/useTeamReviewsSummary';
import { ReviewsCoverageInsight } from '@/components/leader/avaliacoes/ReviewsCoverageInsight';
import { ReviewsCrossMemberTable } from '@/components/leader/avaliacoes/ReviewsCrossMemberTable';
import { ReviewsMemberSheet } from '@/components/leader/avaliacoes/ReviewsMemberSheet';
import { CreateFormalReviewDialog } from '@/components/review/CreateFormalReviewDialog';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

type SubTab = 'monthly' | 'formal';

export default function LiderAvaliacoes() {
  const { members, teams, workspace } = useLeaderMembers();
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { summaryByMember } = useTeamReviewsSummary(memberIds);

  const [sheetMember, setSheetMember] = useState<LeaderMemberRow | null>(null);
  const [sheetTab, setSheetTab] = useState<SubTab>('monthly');
  const [formalMember, setFormalMember] = useState<LeaderMemberRow | null>(null);

  const openMember = (m: LeaderMemberRow, initialTab: SubTab = 'monthly') => {
    setSheetTab(initialTab);
    setSheetMember(m);
  };

  return (
    <div data-tour="reviews-list" className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5">
      <header className="min-w-0">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Rhitmo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estado do Acompanhamento Mensal e das Avaliações Formais do time em uma única visão.
        </p>
      </header>

      <ReviewsCoverageInsight
        members={members}
        summaryByMember={summaryByMember}
        onPickMember={(m) => openMember(m, 'monthly')}
      />

      <ReviewsCrossMemberTable
        members={members}
        teams={teams}
        summaryByMember={summaryByMember}
        onOpenMember={openMember}
        onCreateFormal={(m) => setFormalMember(m)}
      />

      <ReviewsMemberSheet
        member={sheetMember}
        open={!!sheetMember}
        onOpenChange={(o) => { if (!o) setSheetMember(null); }}
        initialTab={sheetTab}
        onCreateFormal={() => {
          if (sheetMember) setFormalMember(sheetMember);
        }}
      />

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
          onReviewCreated={() => {
            setFormalMember(null);
            // Se já tinha sheet aberto desse mesmo liderado, muda pra aba formal
            if (sheetMember) setSheetTab('formal');
          }}
        />
      )}
    </div>
  );
}
