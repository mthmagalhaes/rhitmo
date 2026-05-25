// Sprint 19 — Objetivos cross-member estilo Diário/Pessoas.
// Insight de cobertura + tabela densa (1 linha por liderado) + sheet lateral.
// Suporta criação de meta para múltiplos liderados via seleção em lote.
import { useMemo, useState } from 'react';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { useTeamGoalsSummary } from '@/hooks/useTeamGoalsSummary';
import { GoalsCoverageInsight } from '@/components/leader/objetivos/GoalsCoverageInsight';
import { GoalsCrossMemberTable } from '@/components/leader/objetivos/GoalsCrossMemberTable';
import { GoalsMemberSheet } from '@/components/leader/objetivos/GoalsMemberSheet';
import { NewGoalDialog } from '@/components/NewGoalDialog';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderObjetivos() {
  const { members, teams } = useLeaderMembers();
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { summaryByMember } = useTeamGoalsSummary(memberIds);

  const [sheetMember, setSheetMember] = useState<LeaderMemberRow | null>(null);
  const [sheetNewGoal, setSheetNewGoal] = useState(false);

  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const openMember = (m: LeaderMemberRow) => {
    setSheetNewGoal(false);
    setSheetMember(m);
  };
  const openNewGoalFor = (m: LeaderMemberRow) => {
    setSheetNewGoal(true);
    setSheetMember(m);
  };
  const openBulkNewGoal = (ids: string[]) => {
    setBulkIds(ids);
    setBulkOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5">
      <header className="min-w-0">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Objetivos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe metas, indicadores e datas de cada liderado em uma única visão.
        </p>
      </header>

      <GoalsCoverageInsight
        members={members}
        summaryByMember={summaryByMember}
        onPickMember={openNewGoalFor}
      />

      <GoalsCrossMemberTable
        members={members}
        teams={teams}
        summaryByMember={summaryByMember}
        onOpenMember={openMember}
        onNewGoal={openNewGoalFor}
        onBulkNewGoal={openBulkNewGoal}
      />

      <GoalsMemberSheet
        member={sheetMember}
        open={!!sheetMember}
        onOpenChange={(o) => { if (!o) { setSheetMember(null); setSheetNewGoal(false); } }}
        initialNewGoal={sheetNewGoal}
      />

      <NewGoalDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        memberIds={bulkIds}
      />
    </div>
  );
}
