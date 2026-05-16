// Sheet lateral aberto ao clicar em uma linha de /lider/objetivos.
// Reusa GoalsManager + NewGoalDialog sem alterações.
import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { GoalsManager } from '@/components/GoalsManager';
import { NewGoalDialog } from '@/components/NewGoalDialog';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

interface Props {
  member: LeaderMemberRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Quando true, abre o dialog de nova meta logo ao abrir o sheet.
  initialNewGoal?: boolean;
}

export function GoalsMemberSheet({ member, open, onOpenChange, initialNewGoal }: Props) {
  const [newOpen, setNewOpen] = useState(false);

  // Sincroniza estado inicial sempre que o member ou o open mudam.
  // (Não é Effect; basta acionar via prop quando o pai abrir.)
  if (initialNewGoal && open && !newOpen) {
    // setTimeout para evitar set durante render
    setTimeout(() => setNewOpen(true), 0);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {member && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar
                      memberId={member.id}
                      memberName={member.name}
                      avatarUrl={member.avatar}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <SheetTitle className="font-serif text-xl tracking-tight truncate text-left">
                        {member.name}
                      </SheetTitle>
                      {member.role && (
                        <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setNewOpen(true)}
                    className="rounded-xl gap-2 shrink-0"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    Nova meta
                  </Button>
                </div>
              </SheetHeader>

              <div className="p-6">
                <GoalsManager memberId={member.id} hideHeaderAction />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {member && (
        <NewGoalDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          memberId={member.id}
        />
      )}
    </>
  );
}
