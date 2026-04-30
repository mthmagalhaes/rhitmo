import { MembersGrid } from '@/components/leader/MembersGrid';

/**
 * Diário de Bordo: grid Tako de liderados. Clicando num card, vai para
 * /member/:id (que já hospeda o diário individual).
 */
export default function LiderDiario() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <MembersGrid
        eyebrow="Diário de Bordo"
        title="Selecione um liderado"
        subtitle="Cada liderado tem seu próprio diário com notas, 1:1s e momentos compartilhados."
      />
    </div>
  );
}
