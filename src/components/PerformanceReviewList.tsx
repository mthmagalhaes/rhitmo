import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReviewViewDialog } from "./ReviewViewDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
}

interface PerformanceReviewListProps {
  memberId: string;
  memberName: string;
  onCreateReview?: () => void;
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
        .select('id, title, content, coaching_tip, period_type, period_start, period_end, created_at, shared_with_member')
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  const getPeriodLabel = (periodType: string) => {
    const labels: Record<string, string> = {
      '1_month': 'Mensal',
      '3_months': 'Trimestral',
      '6_months': 'Semestral',
      '12_months': 'Anual',
      'manual': 'Manual',
    };
    return labels[periodType] || periodType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Avaliações Formais</h3>
          <p className="text-sm text-muted-foreground">
            Histórico de avaliações de desempenho de {memberName}
          </p>
        </div>
        <Button onClick={() => onCreateReview?.()} className="gap-2">
          <FileText className="h-4 w-4" />
          Avaliação de Desempenho
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação ainda</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Crie a primeira avaliação de desempenho para {memberName}. 
              A IA irá analisar o histórico de feedbacks e gerar um rascunho estruturado.
            </p>
            <Button onClick={() => onCreateReview?.()} className="gap-2">
              <FileText className="h-4 w-4" />
              Criar Primeira Avaliação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <Card 
              key={review.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedReview(review)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{review.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(review.created_at).toLocaleDateString('pt-BR')}
                      <span className="mx-1">•</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {getPeriodLabel(review.period_type)}
                      </span>
                    </CardDescription>
                  </div>
                  {review.shared_with_member && (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 text-xs border border-emerald-100 gap-1 shrink-0">
                      <Eye className="h-3 w-3" />
                      Visível para o liderado
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <NewReviewDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        memberId={memberId}
        memberName={memberName}
        onReviewCreated={() => queryClient.invalidateQueries({ queryKey: ['performance-reviews', memberId] })}
      />

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