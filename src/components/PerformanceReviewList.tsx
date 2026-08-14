import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, FileText, Eye, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReviewViewDialog } from "./ReviewViewDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface PerformanceReview {
  id: string;
  title: string;
  content: string;
  coaching_tip?: string | null;
  period_type: string;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
  shared_with_member?: boolean;
  acknowledged_at?: string | null;
}

interface PerformanceReviewListProps {
  memberId: string;
  memberName: string;
  onCreateReview?: () => void;
}

type ReviewStatus = 'draft' | 'shared' | 'acknowledged';

const STATUS_META: Record<ReviewStatus, { label: string; defaultOpen: boolean; tone: string }> = {
  draft:        { label: 'Em rascunho',  defaultOpen: true,  tone: 'text-amber-600' },
  shared:       { label: 'Compartilhada', defaultOpen: true,  tone: 'text-emerald-600' },
  acknowledged: { label: 'Confirmada',   defaultOpen: false, tone: 'text-muted-foreground' },
};

function statusOf(r: PerformanceReview): ReviewStatus {
  if (r.acknowledged_at) return 'acknowledged';
  if (r.shared_with_member) return 'shared';
  return 'draft';
}

export const PerformanceReviewList = ({ memberId, memberName, onCreateReview }: PerformanceReviewListProps) => {
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading: loading } = useQuery({
    queryKey: ['performance-reviews', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('id, title, content, coaching_tip, period_type, period_start, period_end, created_at, shared_with_member, acknowledged_at')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar avaliações:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as avaliações.",
          variant: "destructive",
        });
        throw error;
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sincronizar selectedReview quando reviews atualizar
  useEffect(() => {
    if (selectedReview && reviews.length > 0) {
      const updated = reviews.find(r => r.id === selectedReview.id);
      if (updated && (updated.content !== selectedReview.content || updated.title !== selectedReview.title)) {
        setSelectedReview(updated);
      }
    }
  }, [reviews, selectedReview]);

  const grouped = useMemo(() => {
    const acc: Record<ReviewStatus, PerformanceReview[]> = { draft: [], shared: [], acknowledged: [] };
    for (const r of reviews) acc[statusOf(r)].push(r);
    return acc;
  }, [reviews]);

  const getPeriodLabel = (review: PerformanceReview) => {
    if (review.period_start && review.period_end) {
      const fmt = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      };
      return `${fmt(review.period_start)} – ${fmt(review.period_end)}`;
    }
    const labels: Record<string, string> = {
      '1_month': 'Mensal',
      '3_months': 'Trimestral',
      '6_months': 'Semestral',
      '12_months': 'Anual',
      'manual': 'Manual',
      'formal': 'Formal',
    };
    return labels[review.period_type] || review.period_type;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Rhitmo Formal</h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Avaliação de ciclo gerada a partir das evidências e do Acompanhamento Mensal.
            Você escolhe o período, revisa, calibra e compartilha com o liderado.
          </p>
        </div>
        <Button onClick={() => onCreateReview?.()} className="gap-2">
          <FileText className="h-4 w-4" />
          Novo Rhitmo Formal
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum Rhitmo Formal ainda</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Crie o primeiro Rhitmo Formal para {memberName}. A IA monta o rascunho a partir
              das evidências do período escolhido e você calibra antes de compartilhar.
            </p>
            <Button onClick={() => onCreateReview?.()} className="gap-2">
              <FileText className="h-4 w-4" />
              Criar primeiro Rhitmo Formal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {(Object.keys(STATUS_META) as ReviewStatus[]).map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            const meta = STATUS_META[status];
            return (
              <Collapsible key={status} defaultOpen={meta.defaultOpen}>
                <CollapsibleTrigger className="group flex items-center gap-2 w-full text-left py-1.5 mb-1">
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  <span className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", meta.tone)}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    · {items.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="divide-y divide-border/60 border-t border-border/60">
                    {items.map((review) => (
                      <button
                        key={review.id}
                        type="button"
                        onClick={() => setSelectedReview(review)}
                        className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-muted/40 transition-colors group/row"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0 group-hover/row:text-primary">
                          {review.title}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {getPeriodLabel(review)}
                        </span>
                        <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {review.shared_with_member && !review.acknowledged_at && (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 text-[10px] border border-emerald-100 gap-1 shrink-0">
                            <Eye className="h-3 w-3" />
                            Visível
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {selectedReview && (
        <ReviewViewDialog
          open={!!selectedReview}
          onOpenChange={(open) => !open && setSelectedReview(null)}
          review={selectedReview}
          memberId={memberId}
          memberName={memberName}
          onReviewUpdated={() => queryClient.invalidateQueries({ queryKey: ['performance-reviews', memberId] })}
          onReviewDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ['performance-reviews', memberId] });
            setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
};
