import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NewReviewDialog } from "./NewReviewDialog";
import { ReviewViewDialog } from "./ReviewViewDialog";

interface PerformanceReview {
  id: string;
  title: string;
  content: string;
  coaching_tip?: string | null;
  period_type: string;
  created_at: string;
}

interface PerformanceReviewListProps {
  memberId: string;
  memberName: string;
}

export const PerformanceReviewList = ({ memberId, memberName }: PerformanceReviewListProps) => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const { toast } = useToast();

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('id, title, content, coaching_tip, period_type, created_at')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as avaliações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [memberId]);

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
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Avaliação
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
            <Button onClick={() => setShowNewDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
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
        onReviewCreated={loadReviews}
      />

      {selectedReview && (
        <ReviewViewDialog
          open={!!selectedReview}
          onOpenChange={(open) => !open && setSelectedReview(null)}
          review={selectedReview}
          onReviewUpdated={loadReviews}
          onReviewDeleted={loadReviews}
        />
      )}
    </div>
  );
};