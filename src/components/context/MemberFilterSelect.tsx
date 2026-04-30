// Sprint 8.3 — Member filter for the unified context feed.
import { useQuery } from '@tanstack/react-query';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAccount } from '@/contexts/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MemberRow {
  id: string;
  name: string;
}

interface MemberFilterSelectProps {
  value: string | null;
  onChange: (memberId: string | null) => void;
}

const ALL_VALUE = '__all__';

export function MemberFilterSelect({ value, onChange }: MemberFilterSelectProps) {
  const { effectiveUserId } = useEffectiveUser();
  const { workspaceId } = useAccount();

  const { data: members } = useQuery({
    queryKey: ['context-feed-member-options', workspaceId, effectiveUserId],
    enabled: !!workspaceId && !!effectiveUserId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name')
        .eq('workspace_id', workspaceId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
    staleTime: 60_000,
  });

  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(v) => onChange(v === ALL_VALUE ? null : v)}
    >
      <SelectTrigger className="h-9 w-[220px] rounded-xl bg-card border-border/50 text-[13px]">
        <SelectValue placeholder="Liderado: Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>Todos os liderados</SelectItem>
        {(members ?? []).map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
