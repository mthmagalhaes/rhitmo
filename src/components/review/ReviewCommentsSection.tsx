import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewCommentsSectionProps {
  reviewId: string;
}

export function ReviewCommentsSection({ reviewId }: ReviewCommentsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['review-comments', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!reviewId,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('review_comments')
        .insert({
          review_id: reviewId,
          user_id: user!.id,
          content,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] });
      toast.success('Comentário adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar comentário.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('review_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', reviewId] });
      toast.success('Comentário removido.');
    },
    onError: () => toast.error('Erro ao remover comentário.'),
  });

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Comentários ({comments.length})
        </h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment: any) => (
            <div
              key={comment.id}
              className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
                    {comment.user_id === user?.id ? 'Você' : 'Líder'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {comment.user_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon" aria-label="Excluir comentário"
                    className="h-6 w-6"
                    onClick={() => deleteMutation.mutate(comment.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      )}

      {/* New comment input */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={2}
          className="rounded-xl text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="icon" aria-label="Enviar comentário"
          className="shrink-0 rounded-xl h-auto"
          onClick={handleSubmit}
          disabled={!newComment.trim() || addMutation.isPending}
        >
          {addMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
