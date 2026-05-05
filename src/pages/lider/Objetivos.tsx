// Sprint 12.1 — Objetivos com layout Master-Detail estilo Windmill.
import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { EmptyMemberDetail } from '@/components/leader/EmptyMemberDetail';
import { GoalsManager } from '@/components/GoalsManager';
import { NewGoalDialog } from '@/components/NewGoalDialog';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderObjetivos() {
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);
  const [newGoalOpen, setNewGoalOpen] = useState(false);

  return (
    <div className="flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden">
      <MemberMasterList
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        <div className="lg:hidden px-4 sm:px-6 pt-4" />

        {!selected ? (
          <div className="max-w-5xl px-6 lg:px-8 py-6">
            <header className="mb-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Objetivos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhe metas, indicadores e datas de cada liderado.
              </p>
            </header>
            <EmptyMemberDetail
              icon={Target}
              title="Selecione um liderado"
              description="Escolha alguém na lista à esquerda para ver e criar objetivos com data e indicador."
            />
          </div>
        ) : (
          <div className="max-w-5xl px-6 lg:px-8 py-6 space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Objetivos
            </p>

            <header className="flex items-center justify-between gap-3 -mt-4">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  memberId={selected.id}
                  memberName={selected.name}
                  avatarUrl={selected.avatar}
                  size="lg"
                />
                <div>
                  <h1 className="font-serif text-2xl font-bold tracking-tight">
                    {selected.name}
                  </h1>
                  {selected.role && (
                    <p className="text-sm text-muted-foreground">
                      {selected.role}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setNewGoalOpen(true)}
                className="rounded-xl gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova meta
              </Button>
            </header>

            <GoalsManager memberId={selected.id} hideHeaderAction />
          </div>
        )}
      </main>

      {selected && (
        <NewGoalDialog
          open={newGoalOpen}
          onOpenChange={setNewGoalOpen}
          memberId={selected.id}
        />
      )}
    </div>
  );
}
