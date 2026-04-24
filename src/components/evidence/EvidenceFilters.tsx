import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EvidenceStatus, EvidenceCategory } from '@/hooks/useEvidence';

interface Member {
  id: string;
  name: string;
}

interface Props {
  status: EvidenceStatus | 'all';
  category: EvidenceCategory | 'all';
  memberId: string | 'all';
  members: Member[];
  onStatusChange: (s: EvidenceStatus | 'all') => void;
  onCategoryChange: (c: EvidenceCategory | 'all') => void;
  onMemberChange: (m: string | 'all') => void;
}

export function EvidenceFilters({
  status,
  category,
  memberId,
  members,
  onStatusChange,
  onCategoryChange,
  onMemberChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={status} onValueChange={(v) => onStatusChange(v as EvidenceStatus | 'all')}>
        <SelectTrigger className="w-[160px] rounded-xl">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pendentes</SelectItem>
          <SelectItem value="approved">Aprovadas</SelectItem>
          <SelectItem value="converted_to_feedback">Viraram notas</SelectItem>
          <SelectItem value="dismissed">Dispensadas</SelectItem>
          <SelectItem value="all">Todas</SelectItem>
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={(v) => onCategoryChange(v as EvidenceCategory | 'all')}>
        <SelectTrigger className="w-[170px] rounded-xl">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          <SelectItem value="entrega">🚀 Entrega</SelectItem>
          <SelectItem value="reconhecimento">🎉 Reconhecimento</SelectItem>
          <SelectItem value="bloqueio">⚠️ Bloqueio</SelectItem>
          <SelectItem value="conflito">🔥 Conflito</SelectItem>
          <SelectItem value="outro">💬 Outro</SelectItem>
        </SelectContent>
      </Select>

      <Select value={memberId} onValueChange={onMemberChange}>
        <SelectTrigger className="w-[200px] rounded-xl">
          <SelectValue placeholder="Liderado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos liderados</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
