// Diário de Bordo — Master-Detail estilo Notion/Windmill.
// - Banner de privacidade fixo no topo da coluna direita
// - Botão "Nova anotação" abre o NewNoteDialog completo (Magic Paste, templates, smart date, AI title)
// - Feed cronológico abaixo (todas as notas do liderado: privadas + compartilhadas)
// - placeholderData evita "piscar" ao trocar de liderado
import { useMemo, useState } from 'react';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, PenSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const { workspace } = useLeaderMembers(); // pré-aquece cache + obtém workspace para o NewNoteDialog
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks', selected?.id],
    enabled: !!selected,
    // Mantém os dados anteriores enquanto o próximo liderado carrega:
    // troca de pessoa fica instantânea, sem flicker de tela inteira.
    placeholderData: (prev) => prev,
    queryFn: async () => {
      // Diário mostra TODAS as notas do liderado (privadas + compartilhadas).
      // O líder vê tudo de qualquer forma; a distinção visual fica por conta
      // do FeedbackTimeline (cadeado vs. olho).
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('member_id', selected!.id)
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
      result = result.filter((fb) =>
        fb.tags?.some((t) => selectedTags.includes(t)),
      );
    }
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      if (dateRange.to) {
        const to = endOfDay(dateRange.to);
        result = result.filter((fb) =>
          isWithinInterval(new Date(fb.occurred_at || fb.created_at), {
            start: from,
            end: to,
          }),
        );
      } else {
        result = result.filter(
          (fb) => new Date(fb.occurred_at || fb.created_at) >= from,
        );
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
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['feedbacks', selected?.id] });
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden">
      <MemberMasterList
        selectedMemberId={selected?.id ?? null}
        onSelect={(m) => setSelected(m)}
      />

      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        <div className="lg:hidden px-4 sm:px-6 pt-4" />

        {!selected ? (
          <div className="max-w-3xl px-6 lg:px-8 py-6">
            <header className="mb-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Diário de Bordo
              </h1>
              <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                Notas privadas, visíveis apenas para você.
              </p>
            </header>
            <EmptyMemberDetail
              icon={Lock}
              title="Selecione alguém na lista ao lado"
              description="Cada liderado tem seu próprio diário privado. Escolha alguém à esquerda para acessar suas anotações privadas."
            />
          </div>
        ) : (
          <div className="max-w-3xl px-6 lg:px-8 py-6 space-y-6">
            {/* Eyebrow */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Diário de Bordo
            </p>

            {/* Cabeçalho do liderado */}
            <header className="flex items-center gap-3 -mt-3">
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
            </header>

            {/* Banner de privacidade — fixo, discreto, inconfundível */}
            <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 border border-border/60 px-3.5 py-2.5">
              <Lock className="h-3.5 w-3.5 text-foreground/70 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Diário privado.</span>{' '}
                Estas anotações são 100% confidenciais e visíveis apenas para você.
              </p>
            </div>

            {/* Captura rápida — sempre visível, sem modal */}
            <QuickPrivateNoteInput
              memberId={selected.id}
              memberName={selected.name}
            />

            {/* Filtros (só quando há notas) */}
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

            {/* Feed cronológico */}
            {feedbacks.length === 0 ? (
              <Card className="p-8 text-center rounded-2xl border-dashed bg-transparent">
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem anotações privadas para{' '}
                  <span className="font-medium text-foreground">
                    {selected.name.split(' ')[0]}
                  </span>
                  . Que tal registrar a primeira observação acima?
                </p>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center rounded-2xl border-dashed">
                <Search className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma nota encontrada para estes filtros.
                </p>
              </Card>
            ) : (
              <FeedbackTimeline
                feedbacks={filtered as any}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
