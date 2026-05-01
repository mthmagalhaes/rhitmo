// Sprint 12 — Diário de Bordo (Master-Detail, privacy-first).
import { useMemo, useState } from 'react';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, PenSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { EmptyMemberDetail } from '@/components/leader/EmptyMemberDetail';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { FeedbackFilters } from '@/components/FeedbackFilters';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';

export default function LiderDiario() {
  const { workspace } = useLeaderMembers();
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks', selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('member_id', selected!.id)
        .eq('visibility', 'private_leader')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let result = [...feedbacks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((fb) => {
        const titleMatch = fb.title?.toLowerCase().includes(q);
        const plain = (fb.content ?? '').replace(/<[^>]*>/g, '').toLowerCase();
        return titleMatch || plain.includes(q);
      });
    }
    if (selectedTags.length > 0) {
      result = result.filter((fb) => fb.tags?.some((t) => selectedTags.includes(t)));
    }
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      if (dateRange.to) {
        const to = endOfDay(dateRange.to);
        result = result.filter((fb) =>
          isWithinInterval(new Date(fb.occurred_at || fb.created_at), { start: from, end: to }),
        );
      } else {
        result = result.filter((fb) => new Date(fb.occurred_at || fb.created_at) >= from);
      }
    }
    result.sort((a, b) => {
      const dA = new Date(a.occurred_at || a.created_at).getTime();
      const dB = new Date(b.occurred_at || b.created_at).getTime();
      return sortOrder === 'newest' ? dB - dA : dA - dB;
    });
    return result;
  }, [feedbacks, searchQuery, selectedTags, sortOrder, dateRange]);

  async function handleDelete(id: string) {
    const { error } = await supabase.from('feedbacks').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['feedbacks', selected?.id] });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <MemberMasterList
        title="Diário de Bordo"
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0">
        {!selected ? (
          <div className="px-4 sm:px-6 py-8">
            <EmptyMemberDetail
              icon={Lock}
              title="Selecione um liderado"
              description="Cada liderado tem seu próprio diário privado. Escolha alguém à esquerda para começar a anotar."
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {/* Banner privacidade fixo */}
            <Card className="rounded-2xl bg-muted/40 border-border/60 px-4 py-3 flex items-center gap-3">
              <Lock className="h-4 w-4 text-foreground/70 shrink-0" />
              <p className="text-xs text-foreground/80">
                <strong>Notas 100% privadas.</strong> Visíveis apenas para você. O liderado não vê este conteúdo.
              </p>
            </Card>

            {/* Cabeçalho */}
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
                    Diário privado
                  </p>
                  <h1 className="font-serif text-2xl font-bold tracking-tight">
                    {selected.name}
                  </h1>
                </div>
              </div>
              <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-2">
                <PenSquare className="h-4 w-4" />
                Nova nota
              </Button>
            </header>

            {feedbacks.length > 0 && (
              <FeedbackFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            )}

            {feedbacks.length === 0 ? (
              <Card className="p-10 text-center rounded-2xl border-dashed">
                <Lock className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhuma nota privada para este liderado ainda.
                </p>
                <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
                  Adicionar primeira nota
                </Button>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center rounded-2xl border-dashed">
                <Search className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma nota encontrada para estes filtros.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 rounded-full border-border/60 bg-muted/30 text-xs">
                    <Lock className="h-3 w-3" />
                    Todas as notas são privadas
                  </Badge>
                </div>
                <FeedbackTimeline
                  feedbacks={filtered as any}
                  onDelete={handleDelete}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {selected && (
        <NewNoteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedMemberId={selected.id}
          memberName={selected.name}
          workspaceId={workspace?.id}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ['feedbacks', selected.id] })
          }
        />
      )}
    </div>
  );
}
