// Sprint 12 — Objetivos com layout Master-Detail.
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
    <div className="flex min-h-[calc(100vh-4rem)]">
      <MemberMasterList
        title="Objetivos"
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0">
        {!selected ? (
          <div className="px-4 sm:px-6 py-8">
            <EmptyMemberDetail
              icon={Target}
              title="Selecione um liderado"
              description="Escolha alguém na lista à esquerda para ver e criar objetivos com data e indicador."
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  memberId={selected.id}
                  memberName={selected.name}
                  avatarUrl={selected.avatar}
                  size="lg"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Objetivos
                  </p>
                  <h1 className="font-serif text-2xl font-bold tracking-tight">
                    {selected.name}
                  </h1>
                  {selected.role && (
                    <p className="text-sm text-muted-foreground">{selected.role}</p>
                  )}
                </div>
              </div>
              <Button onClick={() => setNewGoalOpen(true)} className="rounded-xl gap-2">
                <Plus className="h-4 w-4" />
                Novo objetivo
              </Button>
            </header>

            <GoalsManager memberId={selected.id} />
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
