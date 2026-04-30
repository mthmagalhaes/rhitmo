import { useState } from 'react';
import { MembersGrid } from '@/components/leader/MembersGrid';
import { NewGoalDialog } from '@/components/NewGoalDialog';

/**
 * Objetivos: seleciona um liderado e abre o NewGoalDialog para criar
 * objetivo / meta. Reutiliza o modal existente sem duplicar lógica.
 */
export default function LiderObjetivos() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <MembersGrid
        eyebrow="Objetivos"
        title="Para quem você vai criar um objetivo?"
        subtitle="Defina metas mensuráveis com data e indicador. O Rhitmo lembra você de revisitar."
        mode="select"
        onMemberSelect={(m) => setSelectedMemberId(m.id)}
      />

      {selectedMemberId && (
        <NewGoalDialog
          open={!!selectedMemberId}
          onOpenChange={(open) => {
            if (!open) setSelectedMemberId(null);
          }}
          memberId={selectedMemberId}
        />
      )}
    </div>
  );
}
