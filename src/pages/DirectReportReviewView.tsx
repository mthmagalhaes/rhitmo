import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectReportReviewView() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: member } = useQuery({
    queryKey: ['linked-member', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, role')
        .eq('linked_user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: review, isLoading, error } = useQuery({
    queryKey: ['shared-review', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('id', reviewId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!reviewId && !!user,
  });

  const editor = useEditor({
    editable: false,
    content: review?.content || '',
    extensions: [StarterKit, Highlight],
  }, [review?.content]);

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('performance_reviews')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', reviewId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-review', reviewId] });
      toast.success('Leitura confirmada com sucesso!');
      // Fire-and-forget email notification to manager
      supabase.functions.invoke('notify-review-acknowledged', { body: { reviewId } })
        .catch(err => console.error('Email notification failed:', err));
    },
    onError: () => toast.error('Erro ao confirmar leitura.'),
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!review || error) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Avaliação não encontrada</h1>
        <p className="text-muted-foreground">Esta avaliação não existe ou não foi compartilhada com você.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const periodLabel = review.period_type === 'manual' ? review.title : `${review.period_type}`;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate('/dashboard')}>
        <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
      </Button>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-xl tracking-tight">{periodLabel}</CardTitle>
              {member && (
                <p className="text-sm text-muted-foreground mt-1">
                  {member.name} • {member.role}
                </p>
              )}
            </div>
            {review.acknowledged_at ? (
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Confirmada
              </Badge>
            ) : (
              <Badge className="gap-1 bg-blue-100 text-blue-700 border-blue-200">
                <Send className="w-3 h-3" /> Enviada
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:mb-4 prose-p:leading-relaxed prose-headings:mb-3 prose-headings:mt-6 prose-ul:my-4 prose-ol:my-4">
            <EditorContent editor={editor} />
          </div>

          {!review.acknowledged_at ? (
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => acknowledgeMutation.mutate()}
                disabled={acknowledgeMutation.isPending}
              >
                {acknowledgeMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Confirmar Leitura
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Leitura confirmada em{' '}
              {new Date(review.acknowledged_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
