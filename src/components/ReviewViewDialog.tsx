import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer, Pencil, Trash2, TrendingUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import DOMPurify from 'dompurify';
import { useQueryClient } from "@tanstack/react-query";

interface PerformanceReview {
  id: string;
  title: string;
  content: string;
  coaching_tip?: string | null;
  period_type: string;
  created_at: string;
}

interface ReviewViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: PerformanceReview;
  memberId: string;
  onReviewUpdated: () => void;
  onReviewDeleted: () => void;
}

export const ReviewViewDialog = ({ 
  open, 
  onOpenChange, 
  review,
  memberId,
  onReviewUpdated,
  onReviewDeleted
}: ReviewViewDialogProps) => {
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(review.title);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Convert Markdown to HTML for the editor when editing starts
  useEffect(() => {
    if (editing) {
      const content = review.content;
      // Check if already HTML or Markdown
      const htmlContent = content.includes('</') ? content : marked.parse(content) as string;
      setEditedContent(htmlContent);
    }
  }, [editing, review.content]);

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível abrir a janela de impressão.",
        variant: "destructive",
      });
      return;
    }

    // Check if content is already HTML (from TipTap) or Markdown
    const htmlContent = review.content.includes('</')
      ? review.content
      : marked(review.content);

    printWindow.document.write(`
      <html>
        <head>
          <title>${review.title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              line-height: 1.6;
              color: #333;
            }
            h1 { 
              color: #222; 
              border-bottom: 3px solid #eee; 
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            h2 { 
              color: #444; 
              margin-top: 32px;
              margin-bottom: 16px;
            }
            h3 {
              color: #555;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            ul, ol { 
              padding-left: 24px;
              margin: 12px 0;
            }
            li {
              margin: 8px 0;
            }
            p {
              margin: 12px 0;
            }
            strong {
              color: #222;
            }
            em {
              color: #666;
            }
            .metadata {
              color: #666;
              font-size: 0.9em;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #ddd;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${review.title}</h1>
          <div class="metadata">
            <p><strong>Data:</strong> ${new Date(review.created_at).toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}</p>
            <p><strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleSave = async () => {
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          title: editedTitle.trim(),
          content: editedContent.trim(),
        })
        .eq('id', review.id);

      if (error) throw error;

      // Invalidar cache para forçar refetch com dados novos
      await queryClient.invalidateQueries({ queryKey: ['performance-reviews', memberId] });

      toast({
        title: "Avaliação atualizada! ✅",
        description: "As alterações foram salvas.",
      });

      onReviewUpdated();
      setEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('performance_reviews')
        .delete()
        .eq('id', review.id);

      if (error) throw error;

      toast({
        title: "Avaliação excluída",
        description: "A avaliação foi removida com sucesso.",
      });

      onReviewDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao deletar avaliação:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover a avaliação.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {editing ? "Editar Avaliação" : review.title}
              <div className="flex gap-2">
                {!editing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportPDF}
                      className="gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
            {!editing && (
              <DialogDescription>
                Criado em {new Date(review.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </DialogDescription>
            )}
          </DialogHeader>

          {review.coaching_tip && !editing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg print:hidden">
              <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                💡 Dicas para Apresentação (Visível apenas para você)
              </p>
              <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                <ReactMarkdown>{review.coaching_tip}</ReactMarkdown>
              </div>
            </div>
          )}

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Conteúdo</Label>
                <RichTextEditor
                  content={editedContent}
                  onChange={setEditedContent}
                  placeholder="Edite o conteúdo da avaliação..."
                  minHeight="400px"
                />
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {review.content.includes('</') ? (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(review.content) }} />
              ) : (
                <ReactMarkdown>{review.content}</ReactMarkdown>
              )}
            </div>
          )}

          {editing && (
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditing(false);
                  setEditedTitle(review.title);
                  setEditedContent(review.content);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A avaliação será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};