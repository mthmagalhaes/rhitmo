import { useQuery } from '@tanstack/react-query';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { supabase } from '@/integrations/supabase/client';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { EmptyStateHero } from '@/components/EmptyStateHero';
import { ClipboardList, Sparkles, FileEdit, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Review {
  id: string;
  title: string;
  created_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  shared_with_member: boolean | null;
  member_id: string;
}

function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Nenhuma avaliação nesta categoria ainda.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {reviews.map((r) => {
        const isAck = !!r.acknowledged_at;
        const isShared = !!r.shared_with_member || !!r.sent_at;
        const label = isAck ? 'concluída' : isShared ? 'compartilhada' : 'rascunho';
        return (
          <Card key={r.id} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  Criada em {new Date(r.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Badge variant="outline" className="text-xs capitalize">{label}</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function LiderAvaliacoes() {
  const { id: userId } = useEffectiveUser();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['leader-reviews', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('id, title, created_at, sent_at, acknowledged_at, shared_with_member, member_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!reviews?.length) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">Performance Reviews fundamentadas em evidências reais.</p>
        </header>
        <EmptyStateHero
          icon={Sparkles}
          title="Configure seu primeiro ciclo"
          description="Crie uma avaliação a partir do dashboard de qualquer liderado. O Rhitmo gera um rascunho com base em notas, 1:1s e feedbacks compartilhados — você só revisa e compartilha."
          ctaLabel="Ir para liderados"
          ctaIcon={ClipboardList}
          onCta={() => (window.location.href = '/lider/pessoas')}
        />
      </div>
    );
  }

  const ativos = reviews.filter((r) => (r.shared_with_member || r.sent_at) && !r.acknowledged_at);
  const rascunhos = reviews.filter((r) => !r.shared_with_member && !r.sent_at);
  const concluidos = reviews.filter((r) => !!r.acknowledged_at);

  const tabs: PageTab[] = [
    { value: 'ativos', label: 'Ativos', icon: ClipboardList, count: ativos.length, content: <ReviewList reviews={ativos} /> },
    { value: 'rascunhos', label: 'Rascunhos', icon: FileEdit, count: rascunhos.length, content: <ReviewList reviews={rascunhos} /> },
    { value: 'concluidos', label: 'Concluídos', icon: CheckCircle2, count: concluidos.length, content: <ReviewList reviews={concluidos} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Avaliações</h1>
        <p className="text-muted-foreground text-sm mt-1">Performance Reviews por liderado, status e ciclo.</p>
      </header>
      <PageTabs tabs={tabs} defaultValue="ativos" />
    </div>
  );
}
